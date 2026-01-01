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
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../common/auth.guard';
import { MessageService } from './services/message.service';
import { TemplateService } from './services/template.service';
import { AutomationService } from './services/automation.service';
import { ChannelService } from './services/channel.service';
import { SchedulerService } from './services/scheduler.service';
import {
  SendMessageDto,
  ScheduleMessageDto,
  MessageFilterDto,
  CreateTemplateDto,
  UpdateTemplateDto,
  PreviewTemplateDto,
  CreateAutomationDto,
  UpdateAutomationDto,
  ChannelConfigDto,
} from './dto';
import { Channel, TemplateCategory } from '@prisma/client';

@ApiTags('Communication')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1/communication')
export class CommunicationController {
  constructor(
    private messageService: MessageService,
    private templateService: TemplateService,
    private automationService: AutomationService,
    private channelService: ChannelService,
    private schedulerService: SchedulerService,
  ) {}

  // ============================================
  // STATS & OVERVIEW
  // ============================================

  @Get('stats')
  @ApiOperation({ summary: 'Get communication stats overview' })
  async getStats(@Request() req: any) {
    return this.messageService.getStats(req.user.tenantId);
  }

  // ============================================
  // MESSAGES
  // ============================================

  @Get('messages')
  @ApiOperation({ summary: 'List messages with filters' })
  async listMessages(@Request() req: any, @Query() filters: MessageFilterDto) {
    return this.messageService.findAll(req.user.tenantId, filters);
  }

  @Get('messages/:id')
  @ApiOperation({ summary: 'Get message details' })
  async getMessage(@Request() req: any, @Param('id') id: string) {
    return this.messageService.findOne(req.user.tenantId, id);
  }

  @Post('messages/send')
  @ApiOperation({ summary: 'Send immediate message' })
  async sendMessage(@Request() req: any, @Body() dto: SendMessageDto) {
    return this.messageService.send(req.user.tenantId, dto, req.user.id);
  }

  @Post('messages/schedule')
  @ApiOperation({ summary: 'Schedule future message' })
  async scheduleMessage(@Request() req: any, @Body() dto: ScheduleMessageDto) {
    return this.messageService.schedule(req.user.tenantId, dto, req.user.id);
  }

  @Delete('messages/scheduled/:id')
  @ApiOperation({ summary: 'Cancel scheduled message' })
  async cancelScheduled(@Request() req: any, @Param('id') id: string) {
    return this.messageService.cancelScheduled(req.user.tenantId, id);
  }

  @Post('messages/:id/retry')
  @ApiOperation({ summary: 'Retry failed message' })
  async retryMessage(@Request() req: any, @Param('id') id: string) {
    return this.messageService.retry(req.user.tenantId, id);
  }

  @Get('messages/scheduled/upcoming')
  @ApiOperation({ summary: 'Get upcoming scheduled messages' })
  async getUpcomingScheduled(
    @Request() req: any,
    @Query('limit') limit?: number,
  ) {
    return this.schedulerService.getUpcoming(req.user.tenantId, limit);
  }

  // ============================================
  // TEMPLATES
  // ============================================

  @Get('templates')
  @ApiOperation({ summary: 'List message templates' })
  async listTemplates(
    @Request() req: any,
    @Query('channel') channel?: Channel,
    @Query('category') category?: TemplateCategory,
  ) {
    return this.templateService.findAll(req.user.tenantId, channel, category);
  }

  @Get('templates/variables')
  @ApiOperation({ summary: 'Get available template variables' })
  getAvailableVariables() {
    return this.templateService.getAvailableVariables();
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get template details' })
  async getTemplate(@Request() req: any, @Param('id') id: string) {
    return this.templateService.findOne(req.user.tenantId, id);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create new template' })
  async createTemplate(@Request() req: any, @Body() dto: CreateTemplateDto) {
    return this.templateService.create(req.user.tenantId, dto, req.user.id);
  }

  @Put('templates/:id')
  @ApiOperation({ summary: 'Update template' })
  async updateTemplate(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.templateService.update(req.user.tenantId, id, dto);
  }

  @Get('templates/:id/versions')
  @ApiOperation({ summary: 'Get template version history' })
  async getTemplateVersions(@Request() req: any, @Param('id') id: string) {
    const template = await this.templateService.findOne(req.user.tenantId, id);
    return this.templateService.getVersions(
      req.user.tenantId,
      template.name,
      template.channel,
    );
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: 'Delete template' })
  async deleteTemplate(@Request() req: any, @Param('id') id: string) {
    return this.templateService.delete(req.user.tenantId, id);
  }

  @Post('templates/:id/preview')
  @ApiOperation({ summary: 'Preview template with sample data' })
  async previewTemplate(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: PreviewTemplateDto,
  ) {
    const template = await this.templateService.findOne(req.user.tenantId, id);
    return this.templateService.preview(
      { subject: template.subject ?? undefined, body: template.body },
      dto.context,
    );
  }

  @Post('templates/:id/duplicate')
  @ApiOperation({ summary: 'Duplicate template' })
  async duplicateTemplate(
    @Request() req: any,
    @Param('id') id: string,
    @Body('name') newName: string,
  ) {
    return this.templateService.duplicate(req.user.tenantId, id, newName);
  }

  // ============================================
  // AUTOMATIONS
  // ============================================

  @Get('automations')
  @ApiOperation({ summary: 'List automation rules' })
  async listAutomations(@Request() req: any) {
    return this.automationService.findAll(req.user.tenantId);
  }

  @Get('automations/triggers')
  @ApiOperation({ summary: 'Get available automation triggers' })
  getAvailableTriggers() {
    return this.automationService.getAvailableTriggers();
  }

  @Get('automations/:id')
  @ApiOperation({ summary: 'Get automation rule details' })
  async getAutomation(@Request() req: any, @Param('id') id: string) {
    return this.automationService.findOne(req.user.tenantId, id);
  }

  @Post('automations')
  @ApiOperation({ summary: 'Create automation rule' })
  async createAutomation(
    @Request() req: any,
    @Body() dto: CreateAutomationDto,
  ) {
    return this.automationService.create(req.user.tenantId, dto, req.user.id);
  }

  @Put('automations/:id')
  @ApiOperation({ summary: 'Update automation rule' })
  async updateAutomation(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateAutomationDto,
  ) {
    return this.automationService.update(req.user.tenantId, id, dto);
  }

  @Delete('automations/:id')
  @ApiOperation({ summary: 'Delete automation rule' })
  async deleteAutomation(@Request() req: any, @Param('id') id: string) {
    return this.automationService.delete(req.user.tenantId, id);
  }

  @Patch('automations/:id/toggle')
  @ApiOperation({ summary: 'Toggle automation rule on/off' })
  async toggleAutomation(@Request() req: any, @Param('id') id: string) {
    return this.automationService.toggle(req.user.tenantId, id);
  }

  // ============================================
  // CHANNELS
  // ============================================

  @Get('channels')
  @ApiOperation({ summary: 'List configured channels' })
  async listChannels(@Request() req: any) {
    return this.channelService.findAll(req.user.tenantId);
  }

  @Get('channels/:channel')
  @ApiOperation({ summary: 'Get channel configuration' })
  async getChannel(@Request() req: any, @Param('channel') channel: Channel) {
    return this.channelService.findOne(req.user.tenantId, channel);
  }

  @Put('channels/:channel')
  @ApiOperation({ summary: 'Update channel configuration' })
  async updateChannel(@Request() req: any, @Body() dto: ChannelConfigDto) {
    return this.channelService.upsert(req.user.tenantId, dto);
  }

  @Post('channels/:channel/test')
  @ApiOperation({ summary: 'Test channel connection' })
  async testChannel(@Request() req: any, @Param('channel') channel: Channel) {
    return this.channelService.test(req.user.tenantId, channel);
  }

  @Delete('channels/:channel')
  @ApiOperation({ summary: 'Remove channel configuration' })
  async deleteChannel(@Request() req: any, @Param('channel') channel: Channel) {
    return this.channelService.delete(req.user.tenantId, channel);
  }
}

