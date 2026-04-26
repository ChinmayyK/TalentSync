import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RateLimited, RateLimitProfile } from '../../common/rate-limit';
import {
  AvailabilityService,
  BusyBlockService,
  CalendarSyncService,
  GoogleCalendarOAuthService,
  MicrosoftCalendarOAuthService,
  SchedulingRulesService,
  SlotService,
  SuggestionService,
  WorkingHoursService,
} from './services';
import {
  AvailabilityQueryDto,
  CalendarCallbackDto,
  CalendarConnectDto,
  ToggleSyncDto,
  CreateBusyBlockDto,
  BusyBlockQueryDto,
  CreateSchedulingRuleDto,
  UpdateSchedulingRuleDto,
  CreateSlotDto,
  GenerateSlotsDto,
  BookSlotDto,
  RescheduleSlotDto,
  SlotQueryDto,
  SetWorkingHoursDto,
  SuggestionQueryDto,
  TeamAvailabilityQueryDto,
} from './dto';

@ApiTags('calendar')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(
    private availabilityService: AvailabilityService,
    private busyBlockService: BusyBlockService,
    private calendarSyncService: CalendarSyncService,
    private googleOAuth: GoogleCalendarOAuthService,
    private microsoftOAuth: MicrosoftCalendarOAuthService,
    private schedulingRulesService: SchedulingRulesService,
    private slotService: SlotService,
    private suggestionService: SuggestionService,
    private workingHoursService: WorkingHoursService,
  ) {}

  // ==================== Availability ====================

  @Get('availability')
  @RateLimited(RateLimitProfile.CALENDAR)
  @ApiOperation({ summary: 'Get availability slots for users in a date range' })
  @ApiResponse({
    status: 200,
    description: 'Available time slots for specified users',
  })
  @ApiResponse({ status: 400, description: 'Invalid date range or user IDs' })
  async getAvailability(@Req() req: any, @Query() query: AvailabilityQueryDto) {
    const tenantId = req.tenantId;
    const userIds = Array.isArray(query.userIds)
      ? query.userIds
      : [query.userIds];

    const start = new Date(query.start);
    const end = new Date(query.end);
    const durationMins = query.durationMins || 60;

    return this.availabilityService.getMultiUserAvailability(
      tenantId,
      userIds,
      start,
      end,
      durationMins,
    );
  }

  @Get('interviewers/:id/availability')
  @RateLimited(RateLimitProfile.CALENDAR)
  @ApiOperation({
    summary:
      'Get detailed availability for a specific interviewer including external calendar busy slots',
  })
  @ApiParam({ name: 'id', description: 'Interviewer user ID' })
  @ApiQuery({
    name: 'start',
    description: 'Start date (ISO 8601)',
    example: '2024-01-15T09:00:00Z',
  })
  @ApiQuery({
    name: 'end',
    description: 'End date (ISO 8601)',
    example: '2024-01-15T18:00:00Z',
  })
  @ApiQuery({
    name: 'durationMins',
    required: false,
    description: 'Slot duration in minutes',
    example: 60,
  })
  @ApiResponse({
    status: 200,
    description:
      'Interviewer availability with free slots, busy slots (with source), and calendar connection status',
  })
  async getInterviewerAvailability(
    @Req() req: any,
    @Param('id') userId: string,
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('durationMins') durationMins?: string,
  ) {
    const tenantId = req.tenantId;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const duration = durationMins ? parseInt(durationMins, 10) : 60;

    // Get internal free intervals
    const freeSlots = await this.availabilityService.getFreeIntervals(
      tenantId,
      userId,
      startDate,
      endDate,
    );

    // Get internal busy blocks
    const internalBusy = await this.busyBlockService.getBusyBlocks(tenantId, {
      userId,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    });

    // Get connected calendar accounts
    const accounts = await this.calendarSyncService.getConnectedAccounts(
      tenantId,
      userId,
    );

    // Fetch external calendar busy slots (graceful failure)
    const externalBusySlots: Array<{
      start: Date;
      end: Date;
      source: 'google' | 'microsoft';
      reason?: string;
    }> = [];
    let calendarSyncError: string | undefined;

    for (const account of accounts) {
      if (!account.syncEnabled) continue;

      if (account.provider === 'google') {
        const result = await this.googleOAuth.getBusySlots(
          account.id,
          startDate,
          endDate,
        );
        if (result.success) {
          externalBusySlots.push(...result.busySlots);
        } else {
          calendarSyncError = result.error;
        }
      } else if (account.provider === 'microsoft') {
        const result = await this.microsoftOAuth.getBusySlots(
          account.id,
          startDate,
          endDate,
        );
        if (result.success) {
          externalBusySlots.push(...result.busySlots);
        } else {
          calendarSyncError = result.error;
        }
      }
    }

    // Combine busy slots with source info
    const busySlots = [
      ...internalBusy.map((b: any) => ({
        start: b.startAt,
        end: b.endAt,
        source: b.source === 'interview' ? 'internal' : b.source,
        reason:
          b.reason ||
          (b.source === 'interview' ? 'Interview scheduled' : 'Busy'),
      })),
      ...externalBusySlots,
    ];

    return {
      userId,
      freeSlots: freeSlots.map((s) => ({
        start: s.start,
        end: s.end,
        durationMins: Math.round((s.end.getTime() - s.start.getTime()) / 60000),
      })),
      busySlots,
      calendarConnected: accounts.some((a) => a.syncEnabled),
      connectedCalendars: accounts.map((a) => ({
        provider: a.provider,
        syncEnabled: a.syncEnabled,
        lastSyncAt: a.lastSyncAt,
      })),
      ...(calendarSyncError && { calendarSyncError }),
    };
  }

  // ==================== Suggestions & Team Availability ====================

  @Post('suggestions')
  @RateLimited(RateLimitProfile.CALENDAR)
  @ApiOperation({ summary: 'Get AI-powered scheduling suggestions' })
  @ApiBody({ type: SuggestionQueryDto })
  @ApiResponse({
    status: 200,
    description: 'List of optimal scheduling suggestions',
  })
  async getSuggestions(@Req() req: any, @Body() dto: SuggestionQueryDto) {
    return this.suggestionService.getSuggestions(req.tenantId, dto);
  }

  @Get('team-availability')
  @RateLimited(RateLimitProfile.CALENDAR)
  @ApiOperation({ summary: 'Get team-wide availability overview' })
  @ApiResponse({ status: 200, description: 'Team availability matrix' })
  async getTeamAvailability(
    @Req() req: any,
    @Query() query: TeamAvailabilityQueryDto,
  ) {
    return this.suggestionService.getTeamAvailability(req.tenantId, query);
  }

  // ==================== Slots ====================

  @Get('slots')
  @ApiOperation({ summary: 'List all interview slots' })
  @ApiResponse({ status: 200, description: 'List of interview slots' })
  async getSlots(@Req() req: any, @Query() query: SlotQueryDto) {
    return this.slotService.getSlots(req.tenantId, query);
  }

  @Get('slots/:id')
  @ApiOperation({ summary: 'Get slot details by ID' })
  @ApiParam({ name: 'id', description: 'Slot ID' })
  @ApiResponse({ status: 200, description: 'Slot details' })
  @ApiResponse({ status: 404, description: 'Slot not found' })
  async getSlot(@Req() req: any, @Param('id') id: string) {
    return this.slotService.getSlot(req.tenantId, id);
  }

  @Post('slots')
  @UseGuards(RbacGuard)
  @Roles('RECRUITER', 'MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Create a new interview slot' })
  @ApiBody({ type: CreateSlotDto })
  @ApiResponse({ status: 201, description: 'Slot created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid slot data' })
  async createSlot(@Req() req: any, @Body() dto: CreateSlotDto) {
    return this.slotService.createSlot(req.tenantId, req.user.sub, dto);
  }

  @Post('slots/generate')
  @UseGuards(RbacGuard)
  @Roles('RECRUITER', 'MANAGER', 'ADMIN')
  @ApiOperation({
    summary: 'Auto-generate interview slots based on working hours',
  })
  @ApiBody({ type: GenerateSlotsDto })
  @ApiResponse({
    status: 201,
    description: 'Slots generated successfully',
    schema: { example: { generated: 10 } },
  })
  async generateSlots(@Req() req: any, @Body() dto: GenerateSlotsDto) {
    return this.slotService.generateSlots(req.tenantId, req.user.sub, dto);
  }

  @Post('slots/:id/book')
  @ApiOperation({ summary: 'Book an interview slot for a candidate' })
  @ApiParam({ name: 'id', description: 'Slot ID to book' })
  @ApiBody({ type: BookSlotDto })
  @ApiResponse({ status: 200, description: 'Slot booked successfully' })
  @ApiResponse({ status: 404, description: 'Slot not found' })
  @ApiResponse({ status: 409, description: 'Slot already booked' })
  async bookSlot(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: BookSlotDto,
  ) {
    return this.slotService.bookSlot(req.tenantId, id, req.user.sub, dto);
  }

  @Patch('slots/:id/reschedule')
  @ApiOperation({ summary: 'Reschedule an existing slot' })
  @ApiParam({ name: 'id', description: 'Slot ID to reschedule' })
  @ApiBody({ type: RescheduleSlotDto })
  @ApiResponse({ status: 200, description: 'Slot rescheduled successfully' })
  @ApiResponse({ status: 404, description: 'Slot not found' })
  async rescheduleSlot(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: RescheduleSlotDto,
  ) {
    return this.slotService.rescheduleSlot(req.tenantId, id, req.user.sub, dto);
  }

  @Post('slots/:id/cancel')
  @ApiOperation({ summary: 'Cancel a scheduled slot' })
  @ApiParam({ name: 'id', description: 'Slot ID to cancel' })
  @ApiResponse({ status: 200, description: 'Slot cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Slot not found' })
  async cancelSlot(@Req() req: any, @Param('id') id: string) {
    return this.slotService.cancelSlot(req.tenantId, id, req.user.sub);
  }

  // ==================== Working Hours ====================

  @Get('working-hours')
  @ApiOperation({ summary: 'Get working hours for a user' })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'User ID (defaults to current user)',
  })
  @ApiResponse({ status: 200, description: 'User working hours configuration' })
  async getWorkingHours(@Req() req: any, @Query('userId') userId?: string) {
    const targetUserId = userId || req.user.sub;
    return this.workingHoursService.getWorkingHours(req.tenantId, targetUserId);
  }

  @Put('working-hours')
  @ApiOperation({ summary: 'Set working hours for current user' })
  @ApiBody({ type: SetWorkingHoursDto })
  @ApiResponse({ status: 200, description: 'Working hours updated' })
  async setWorkingHours(@Req() req: any, @Body() dto: SetWorkingHoursDto) {
    return this.workingHoursService.setWorkingHours(
      req.tenantId,
      req.user.sub,
      req.user.role,
      dto,
    );
  }

  // ==================== Busy Blocks ====================

  @Get('busy-blocks')
  @ApiOperation({ summary: 'List busy blocks (time-off, meetings, etc.)' })
  @ApiResponse({ status: 200, description: 'List of busy blocks' })
  async getBusyBlocks(@Req() req: any, @Query() query: BusyBlockQueryDto) {
    return this.busyBlockService.getBusyBlocks(req.tenantId, query);
  }

  @Post('busy-blocks')
  @ApiOperation({ summary: 'Create a busy block (mark time as unavailable)' })
  @ApiBody({ type: CreateBusyBlockDto })
  @ApiResponse({ status: 201, description: 'Busy block created' })
  async createBusyBlock(@Req() req: any, @Body() dto: CreateBusyBlockDto) {
    return this.busyBlockService.createBusyBlock(
      req.tenantId,
      req.user.sub,
      dto,
    );
  }

  @Delete('busy-blocks/:id')
  @ApiOperation({ summary: 'Delete a busy block' })
  @ApiParam({ name: 'id', description: 'Busy block ID' })
  @ApiResponse({ status: 200, description: 'Busy block deleted' })
  @ApiResponse({ status: 404, description: 'Busy block not found' })
  async deleteBusyBlock(@Req() req: any, @Param('id') id: string) {
    return this.busyBlockService.deleteBusyBlock(
      req.tenantId,
      req.user.sub,
      id,
    );
  }

  // ==================== Scheduling Rules ====================

  @Get('rules')
  @ApiOperation({ summary: 'List all scheduling rules for tenant' })
  @ApiResponse({ status: 200, description: 'List of scheduling rules' })
  async getRules(@Req() req: any) {
    return this.schedulingRulesService.getRules(req.tenantId);
  }

  @Get('rules/:id')
  @ApiOperation({ summary: 'Get scheduling rule by ID' })
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiResponse({ status: 200, description: 'Scheduling rule details' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async getRule(@Req() req: any, @Param('id') id: string) {
    return this.schedulingRulesService.getRule(req.tenantId, id);
  }

  @Post('rules')
  @UseGuards(RbacGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new scheduling rule (Admin only)' })
  @ApiBody({ type: CreateSchedulingRuleDto })
  @ApiResponse({ status: 201, description: 'Rule created successfully' })
  async createRule(@Req() req: any, @Body() dto: CreateSchedulingRuleDto) {
    return this.schedulingRulesService.createRule(
      req.tenantId,
      req.user.sub,
      dto,
    );
  }

  @Put('rules/:id')
  @UseGuards(RbacGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a scheduling rule (Admin only)' })
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiBody({ type: UpdateSchedulingRuleDto })
  @ApiResponse({ status: 200, description: 'Rule updated' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async updateRule(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateSchedulingRuleDto,
  ) {
    return this.schedulingRulesService.updateRule(req.tenantId, id, dto);
  }

  @Delete('rules/:id')
  @UseGuards(RbacGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a scheduling rule (Admin only)' })
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiResponse({ status: 200, description: 'Rule deleted' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async deleteRule(@Req() req: any, @Param('id') id: string) {
    return this.schedulingRulesService.deleteRule(req.tenantId, id);
  }

  // ==================== Calendar Sync ====================

  @Get('sync/accounts')
  @ApiOperation({ summary: 'Get connected calendar accounts' })
  @ApiResponse({
    status: 200,
    description: 'List of connected calendar accounts',
  })
  async getConnectedAccounts(@Req() req: any) {
    const accounts = await this.calendarSyncService.getConnectedAccounts(
      req.tenantId,
      req.user.id,
    );
    return { accounts };
  }

  @Get('sync/google/auth-url')
  @ApiOperation({ summary: 'Get Google Calendar OAuth URL' })
  @ApiResponse({ status: 200, description: 'Google OAuth authorization URL' })
  async getGoogleAuthUrl(@Req() req: any, @Query() dto: CalendarConnectDto) {
    const authUrl = this.googleOAuth.getAuthUrl(
      req.tenantId,
      req.user.id,
      dto.redirectUri,
    );
    return { authUrl };
  }

  @Post('sync/google/callback')
  @ApiOperation({ summary: 'Handle Google Calendar OAuth callback' })
  @ApiBody({ type: CalendarCallbackDto })
  @ApiResponse({
    status: 200,
    description: 'Google Calendar connected successfully',
  })
  async googleCallback(@Req() req: any, @Body() dto: CalendarCallbackDto) {
    return this.googleOAuth.exchangeCode(
      req.tenantId,
      req.user.id,
      dto.code,
      dto.redirectUri,
    );
  }

  @Delete('sync/google')
  @ApiOperation({ summary: 'Disconnect Google Calendar' })
  @ApiResponse({ status: 200, description: 'Google Calendar disconnected' })
  async disconnectGoogle(@Req() req: any) {
    await this.googleOAuth.disconnect(req.tenantId, req.user.id);
    return { success: true };
  }

  @Get('sync/microsoft/auth-url')
  @ApiOperation({ summary: 'Get Microsoft Outlook OAuth URL' })
  @ApiResponse({
    status: 200,
    description: 'Microsoft OAuth authorization URL',
  })
  async getMicrosoftAuthUrl(@Req() req: any, @Query() dto: CalendarConnectDto) {
    const authUrl = this.microsoftOAuth.getAuthUrl(
      req.tenantId,
      req.user.id,
      dto.redirectUri,
    );
    return { authUrl };
  }

  @Post('sync/microsoft/callback')
  @ApiOperation({ summary: 'Handle Microsoft Outlook OAuth callback' })
  @ApiBody({ type: CalendarCallbackDto })
  @ApiResponse({
    status: 200,
    description: 'Microsoft Calendar connected successfully',
  })
  async microsoftCallback(@Req() req: any, @Body() dto: CalendarCallbackDto) {
    return this.microsoftOAuth.exchangeCode(
      req.tenantId,
      req.user.id,
      dto.code,
      dto.redirectUri,
    );
  }

  @Delete('sync/microsoft')
  @ApiOperation({ summary: 'Disconnect Microsoft Outlook' })
  @ApiResponse({ status: 200, description: 'Microsoft Calendar disconnected' })
  async disconnectMicrosoft(@Req() req: any) {
    await this.microsoftOAuth.disconnect(req.tenantId, req.user.id);
    return { success: true };
  }

  @Post('sync/:accountId/sync')
  @ApiOperation({ summary: 'Trigger manual calendar sync' })
  @ApiParam({ name: 'accountId', description: 'Connected account ID' })
  @ApiResponse({
    status: 200,
    description: 'Sync completed',
    schema: { example: { success: true, eventsProcessed: 15 } },
  })
  async syncCalendar(@Param('accountId') accountId: string) {
    const result = await this.calendarSyncService.syncCalendar(accountId);
    return { success: true, eventsProcessed: result.eventsProcessed };
  }

  @Patch('sync/:accountId/toggle')
  @ApiOperation({ summary: 'Enable/disable automatic sync for an account' })
  @ApiParam({ name: 'accountId', description: 'Connected account ID' })
  @ApiBody({ type: ToggleSyncDto })
  @ApiResponse({ status: 200, description: 'Sync toggled' })
  async toggleSync(
    @Param('accountId') accountId: string,
    @Body() dto: ToggleSyncDto,
  ) {
    await this.calendarSyncService.toggleSyncEnabled(accountId, dto.enabled);
    return { success: true };
  }
}
