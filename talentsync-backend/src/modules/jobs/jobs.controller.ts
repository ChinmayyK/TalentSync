import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '../../common/auth.guard';
import { JobsService } from './jobs.service';
import { CreateJobDto, UpdateJobDto, QueryJobsDto } from './dto';

interface AuthenticatedRequest {
  tenantId: string;
  user?: { id: string; email: string };
}

@ApiTags('Jobs')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1/jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new job posting' })
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateJobDto,
  ) {
    return this.jobsService.create(req.tenantId, dto, req.user?.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all jobs with filtering and pagination' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query() query: QueryJobsDto,
  ) {
    return this.jobsService.findAll(req.tenantId, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get job statistics' })
  async getStats(@Request() req: AuthenticatedRequest) {
    return this.jobsService.getStats(req.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a job by ID' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  async findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.jobsService.findOne(req.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a job' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateJobDto,
  ) {
    return this.jobsService.update(req.tenantId, id, dto);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish a draft job' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  async publish(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.jobsService.publish(req.tenantId, id);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close a job' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  async close(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.jobsService.close(req.tenantId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a job (soft delete)' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  async delete(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.jobsService.delete(req.tenantId, id);
  }
}
