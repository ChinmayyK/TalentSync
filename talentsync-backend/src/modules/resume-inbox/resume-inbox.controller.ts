import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ResumeInboxService } from './resume-inbox.service';
import {
  CreateResumeInboxDto,
  UpdateResumeInboxDto,
  EmailFilterDto,
} from './dto';

@ApiTags('Resume Inbox')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/resume-inbox')
export class ResumeInboxController {
  constructor(private readonly service: ResumeInboxService) {}

  // =====================
  // Inbox Management
  // =====================

  @Post('inboxes')
  @ApiOperation({ summary: 'Create a new resume inbox' })
  @ApiResponse({ status: 201, description: 'Inbox created successfully' })
  async createInbox(@Req() req: any, @Body() dto: CreateResumeInboxDto) {
    return this.service.createInbox(req.tenantId, dto, req.user?.sub);
  }

  @Get('inboxes')
  @ApiOperation({ summary: 'List all resume inboxes' })
  @ApiResponse({ status: 200, description: 'List of inboxes' })
  async listInboxes(@Req() req: any) {
    return this.service.listInboxes(req.tenantId);
  }

  @Get('inboxes/:id')
  @ApiOperation({ summary: 'Get a specific inbox' })
  @ApiResponse({ status: 200, description: 'Inbox details' })
  async getInbox(@Req() req: any, @Param('id') id: string) {
    return this.service.getInbox(req.tenantId, id);
  }

  @Put('inboxes/:id')
  @ApiOperation({ summary: 'Update an inbox' })
  @ApiResponse({ status: 200, description: 'Inbox updated successfully' })
  async updateInbox(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateResumeInboxDto,
  ) {
    return this.service.updateInbox(req.tenantId, id, dto);
  }

  @Delete('inboxes/:id')
  @ApiOperation({ summary: 'Delete an inbox' })
  @ApiResponse({ status: 200, description: 'Inbox deleted successfully' })
  async deleteInbox(@Req() req: any, @Param('id') id: string) {
    return this.service.deleteInbox(req.tenantId, id);
  }

  // =====================
  // Connection Testing
  // =====================

  @Post('inboxes/:id/test')
  @ApiOperation({ summary: 'Test IMAP connection for an existing inbox' })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  async testConnection(@Req() req: any, @Param('id') id: string) {
    return this.service.testConnection(req.tenantId, id);
  }

  @Post('test-connection')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test IMAP connection with provided credentials' })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  async testConnectionWithCredentials(@Body() dto: CreateResumeInboxDto) {
    return this.service.testConnectionWithCredentials(dto);
  }

  // =====================
  // Polling
  // =====================

  @Post('inboxes/:id/poll')
  @ApiOperation({ summary: 'Manually trigger inbox polling' })
  @ApiResponse({ status: 200, description: 'Poll results' })
  async pollInbox(@Req() req: any, @Param('id') id: string) {
    return this.service.pollInbox(req.tenantId, id);
  }

  // =====================
  // Email Management
  // =====================

  @Get('emails')
  @ApiOperation({ summary: 'List emails with filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of emails' })
  async listEmails(@Req() req: any, @Query() filter: EmailFilterDto) {
    return this.service.listEmails(req.tenantId, filter);
  }

  @Get('emails/:id')
  @ApiOperation({ summary: 'Get email details' })
  @ApiResponse({ status: 200, description: 'Email details' })
  async getEmail(@Req() req: any, @Param('id') id: string) {
    return this.service.getEmail(req.tenantId, id);
  }

  @Post('emails/:id/process')
  @ApiOperation({ summary: 'Process an email (parse resume)' })
  @ApiResponse({ status: 200, description: 'Processing result' })
  async processEmail(@Req() req: any, @Param('id') id: string) {
    return this.service.processEmail(req.tenantId, id, req.user?.sub);
  }

  @Post('emails/:id/skip')
  @ApiOperation({ summary: 'Skip an email' })
  @ApiResponse({ status: 200, description: 'Email skipped' })
  async skipEmail(@Req() req: any, @Param('id') id: string) {
    return this.service.skipEmail(req.tenantId, id, req.user?.sub);
  }

  @Post('emails/:id/create-candidate')
  @ApiOperation({ summary: 'Create a candidate from a parsed email' })
  @ApiResponse({ status: 201, description: 'Candidate created' })
  async createCandidateFromEmail(@Req() req: any, @Param('id') id: string) {
    return this.service.createCandidateFromEmail(
      req.tenantId,
      id,
      req.user?.sub,
    );
  }
}
