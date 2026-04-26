import {
  Controller,
  Post,
  Get,
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
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { InterviewsService } from './interviews.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import {
  RescheduleInterviewDto,
  RescheduleResponseDto,
} from './dto/reschedule-interview.dto';
import { ListInterviewsDto } from './dto/list-interviews.dto';
import { BulkScheduleDto } from './dto/bulk-schedule.dto';
import {
  CreateInterviewNoteDto,
  UpdateInterviewNoteDto,
} from './dto/interview-note.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RateLimited, RateLimitProfile } from '../../common/rate-limit';

@ApiTags('interviews')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/interviews')
@UseGuards(JwtAuthGuard, RbacGuard)
export class InterviewsController {
  constructor(private svc: InterviewsService) {}

  @Post()
  @RateLimited(RateLimitProfile.WRITE)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER')
  @ApiOperation({ summary: 'Schedule a new interview' })
  @ApiBody({ type: CreateInterviewDto })
  @ApiResponse({ status: 201, description: 'Interview scheduled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Scheduling conflict detected' })
  create(@Req() req: any, @Body() dto: CreateInterviewDto) {
    return this.svc.create(req.user.tenantId, req.user.sub, dto);
  }

  @Post('bulk-schedule')
  @RateLimited(RateLimitProfile.BULK)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER')
  @ApiOperation({ summary: 'Schedule multiple interviews at once' })
  @ApiBody({ type: BulkScheduleDto })
  @ApiResponse({
    status: 201,
    description: 'Interviews scheduled successfully',
    schema: { example: { scheduled: 5, failed: 0, errors: [] } },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  bulkSchedule(@Req() req: any, @Body() dto: BulkScheduleDto) {
    return this.svc.bulkSchedule(req.user.tenantId, req.user.sub, dto);
  }

  @Patch(':id/reschedule')
  @RateLimited(RateLimitProfile.WRITE)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER')
  @ApiOperation({
    summary: 'Reschedule an existing interview (drag-and-drop)',
    description:
      'Reschedules an interview to a new time. Conflicts are returned as warnings but do not block the operation.',
  })
  @ApiParam({ name: 'id', description: 'Interview ID to reschedule' })
  @ApiBody({ type: RescheduleInterviewDto })
  @ApiResponse({
    status: 200,
    description: 'Interview rescheduled successfully',
    type: RescheduleResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Interview cannot be rescheduled (invalid status)',
  })
  @ApiResponse({ status: 404, description: 'Interview not found' })
  reschedule(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: RescheduleInterviewDto,
  ) {
    return this.svc.reschedule(req.user.tenantId, req.user.sub, id, dto);
  }

  @Get()
  @RateLimited(RateLimitProfile.READ)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER', 'INTERVIEWER')
  @ApiOperation({ summary: 'List all interviews with filters and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of interviews',
    schema: { example: { data: [], total: 0, page: 1, limit: 20 } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  list(@Req() req: any, @Query() dto: ListInterviewsDto) {
    return this.svc.list(req.user.tenantId, dto);
  }

  @Get(':id')
  @RateLimited(RateLimitProfile.READ)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER', 'INTERVIEWER')
  @ApiOperation({ summary: 'Get interview details by ID' })
  @ApiParam({ name: 'id', description: 'Interview ID' })
  @ApiResponse({
    status: 200,
    description: 'Interview details with candidate and interviewer info',
  })
  @ApiResponse({ status: 404, description: 'Interview not found' })
  get(@Req() req: any, @Param('id') id: string) {
    return this.svc.get(req.user.tenantId, id);
  }

  @Post(':id/cancel')
  @RateLimited(RateLimitProfile.WRITE)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER')
  @ApiOperation({ summary: 'Cancel a scheduled interview' })
  @ApiParam({ name: 'id', description: 'Interview ID to cancel' })
  @ApiResponse({ status: 200, description: 'Interview cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Interview not found' })
  @ApiResponse({
    status: 400,
    description: 'Interview already completed or cancelled',
  })
  async cancel(@Req() req: any, @Param('id') id: string) {
    return this.svc.cancel(req.user.tenantId, req.user.sub, id);
  }

  @Post(':id/sync-calendar')
  @RateLimited(RateLimitProfile.WRITE)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Sync interview with external calendar (Admin only)',
  })
  @ApiParam({ name: 'id', description: 'Interview ID' })
  @ApiResponse({ status: 200, description: 'Calendar sync triggered' })
  sync(@Req() req: any, @Param('id') id: string) {
    return { message: 'Sync triggered' };
  }

  @Post(':id/complete')
  @RateLimited(RateLimitProfile.WRITE)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER', 'INTERVIEWER')
  @ApiOperation({ summary: 'Mark an interview as completed' })
  @ApiParam({ name: 'id', description: 'Interview ID' })
  @ApiResponse({ status: 200, description: 'Interview marked as completed' })
  @ApiResponse({ status: 404, description: 'Interview not found' })
  @ApiResponse({
    status: 400,
    description: 'Interview already completed or cancelled',
  })
  complete(@Req() req: any, @Param('id') id: string) {
    return this.svc.complete(req.user.tenantId, req.user.sub, id);
  }

  // =====================================================
  // INTERVIEW NOTES
  // =====================================================

  @Get(':id/notes')
  @RateLimited(RateLimitProfile.READ)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER', 'INTERVIEWER')
  @ApiOperation({ summary: 'List all notes for an interview' })
  @ApiParam({ name: 'id', description: 'Interview ID' })
  @ApiResponse({
    status: 200,
    description: 'List of notes with author details',
  })
  listNotes(@Req() req: any, @Param('id') id: string) {
    return this.svc.listNotes(req.user.tenantId, id);
  }

  @Post(':id/notes')
  @RateLimited(RateLimitProfile.WRITE)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER', 'INTERVIEWER')
  @ApiOperation({ summary: 'Add a note to an interview' })
  @ApiParam({ name: 'id', description: 'Interview ID' })
  @ApiBody({ type: CreateInterviewNoteDto })
  @ApiResponse({ status: 201, description: 'Note created' })
  addNote(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CreateInterviewNoteDto,
  ) {
    return this.svc.addNote(req.user.tenantId, id, req.user.sub, dto.content);
  }

  @Patch(':id/notes/:noteId')
  @RateLimited(RateLimitProfile.WRITE)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER', 'INTERVIEWER')
  @ApiOperation({ summary: 'Update an interview note (author or admin)' })
  @ApiParam({ name: 'id', description: 'Interview ID' })
  @ApiParam({ name: 'noteId', description: 'Note ID' })
  @ApiBody({ type: UpdateInterviewNoteDto })
  @ApiResponse({ status: 200, description: 'Note updated' })
  updateNote(
    @Req() req: any,
    @Param('noteId') noteId: string,
    @Body() dto: UpdateInterviewNoteDto,
  ) {
    return this.svc.updateNote(
      req.user.tenantId,
      noteId,
      req.user.sub,
      req.user.role,
      dto.content,
    );
  }

  @Delete(':id/notes/:noteId')
  @RateLimited(RateLimitProfile.WRITE)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER', 'INTERVIEWER')
  @ApiOperation({ summary: 'Delete an interview note (author or admin)' })
  @ApiParam({ name: 'id', description: 'Interview ID' })
  @ApiParam({ name: 'noteId', description: 'Note ID' })
  @ApiResponse({ status: 200, description: 'Note deleted' })
  deleteNote(@Req() req: any, @Param('noteId') noteId: string) {
    return this.svc.deleteNote(
      req.user.tenantId,
      noteId,
      req.user.sub,
      req.user.role,
    );
  }

  // =====================================================
  // INTERVIEW TIMELINE
  // =====================================================

  @Get(':id/timeline')
  @RateLimited(RateLimitProfile.READ)
  @Roles('ADMIN', 'MANAGER', 'RECRUITER', 'INTERVIEWER')
  @ApiOperation({
    summary: 'Get interview timeline (notes, feedback, activity)',
  })
  @ApiParam({ name: 'id', description: 'Interview ID' })
  @ApiResponse({
    status: 200,
    description: 'Timeline with notes, feedback, and activity',
  })
  getTimeline(@Req() req: any, @Param('id') id: string) {
    return this.svc.getTimeline(req.user.tenantId, id);
  }
}
