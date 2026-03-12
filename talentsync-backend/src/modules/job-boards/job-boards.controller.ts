import {
  Controller,
  Get,
  Post,
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
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { JobBoardsService } from './job-boards.service';
import {
  PostJobDto,
  QueryJobPostingsDto,
  UpdateJobPostingDto,
  SaveJobBoardCredentialsDto,
  BatchPostDto,
  JobBoardProvider,
} from './dto';

@ApiTags('Job Boards')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('api/v1/job-boards')
export class JobBoardsController {
  constructor(private readonly jobBoardsService: JobBoardsService) {}

  // ==========================================
  // Provider Configuration
  // ==========================================

  @Get('providers')
  @ApiOperation({
    summary: 'Get available job board providers and configuration status',
  })
  async getProviders(@Req() req: any) {
    return this.jobBoardsService.getAvailableProviders(req.user.tenantId);
  }

  @Post('credentials')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Save credentials for a job board provider' })
  async saveCredentials(
    @Req() req: any,
    @Body() dto: SaveJobBoardCredentialsDto,
  ) {
    return this.jobBoardsService.saveCredentials(
      req.user.tenantId,
      req.user.sub,
      dto,
    );
  }

  @Get('credentials/:provider')
  @Roles('ADMIN')
  @ApiOperation({
    summary:
      'Get credential status for a provider (does not return actual credentials)',
  })
  @ApiParam({ name: 'provider', enum: JobBoardProvider })
  async getCredentialsStatus(
    @Req() req: any,
    @Param('provider') provider: JobBoardProvider,
  ) {
    return this.jobBoardsService.getCredentialsStatus(
      req.user.tenantId,
      provider,
    );
  }

  @Delete('credentials/:provider')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete credentials for a job board provider' })
  @ApiParam({ name: 'provider', enum: JobBoardProvider })
  async deleteCredentials(
    @Req() req: any,
    @Param('provider') provider: JobBoardProvider,
  ) {
    return this.jobBoardsService.deleteCredentials(
      req.user.tenantId,
      req.user.sub,
      provider,
    );
  }

  @Post('test-connection/:provider')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Test connection for a job board provider' })
  @ApiParam({ name: 'provider', enum: JobBoardProvider })
  async testConnection(
    @Req() req: any,
    @Param('provider') provider: JobBoardProvider,
  ) {
    return this.jobBoardsService.testConnection(req.user.tenantId, provider);
  }

  // ==========================================
  // Job Posting
  // ==========================================

  @Post('post')
  @Roles('RECRUITER', 'MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Post a job to an external job board' })
  async postJob(@Req() req: any, @Body() dto: PostJobDto) {
    return this.jobBoardsService.postJob(req.user.tenantId, dto, req.user.sub);
  }

  @Post('batch-post')
  @Roles('RECRUITER', 'MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Post a job to multiple job boards at once' })
  async batchPost(@Req() req: any, @Body() dto: BatchPostDto) {
    return this.jobBoardsService.batchPost(
      req.user.tenantId,
      dto,
      req.user.sub,
    );
  }

  // ==========================================
  // Posting Management
  // ==========================================

  @Get('postings')
  @ApiOperation({ summary: 'List all job postings' })
  async findAll(@Req() req: any, @Query() query: QueryJobPostingsDto) {
    return this.jobBoardsService.findAll(req.user.tenantId, query);
  }

  @Get('postings/:id')
  @ApiOperation({ summary: 'Get job posting by ID' })
  @ApiParam({ name: 'id', description: 'Posting ID' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.jobBoardsService.findOne(req.user.tenantId, id);
  }

  @Patch('postings/:id')
  @Roles('RECRUITER', 'MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Update a job posting' })
  @ApiParam({ name: 'id', description: 'Posting ID' })
  async updatePosting(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateJobPostingDto,
  ) {
    return this.jobBoardsService.updatePosting(
      req.user.tenantId,
      id,
      req.user.sub,
      dto,
    );
  }

  @Post('postings/:id/sync')
  @Roles('RECRUITER', 'MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Sync status from external job board' })
  @ApiParam({ name: 'id', description: 'Posting ID' })
  async syncStatus(@Req() req: any, @Param('id') id: string) {
    return this.jobBoardsService.syncStatus(req.user.tenantId, id);
  }

  @Delete('postings/:id')
  @Roles('RECRUITER', 'MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Close a job posting' })
  @ApiParam({ name: 'id', description: 'Posting ID' })
  async closePosting(@Req() req: any, @Param('id') id: string) {
    return this.jobBoardsService.closePosting(
      req.user.tenantId,
      id,
      req.user.sub,
    );
  }
}
