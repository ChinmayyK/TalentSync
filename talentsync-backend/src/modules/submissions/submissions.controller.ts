import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SubmissionsService } from './submissions.service';
import { TriggerManualSubmissionDto, ManualSubmissionResponseDto } from './dto';

interface AuthenticatedRequest {
  user: {
    sub: string;
    tenantId: string;
    email?: string;
    name?: string;
  };
}

@ApiTags('ops-submissions')
@Controller('api/v1/ops/submissions')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth()
export class SubmissionsController {
  constructor(private submissionsService: SubmissionsService) {}

  /**
   * POST /api/v1/ops/submissions/manual-run
   * Manually trigger the automatic submission workflow for today's eligible interviews
   */
  @Post('manual-run')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiOperation({
    summary: 'Trigger manual submission workflow',
    description:
      'Submits all eligible interviews scheduled for today. Eligibility: approved, not cancelled, not already submitted.',
  })
  @ApiResponse({
    status: 200,
    description: 'Manual submission completed',
    type: ManualSubmissionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires ADMIN or SUPERADMIN role',
  })
  async runManualSubmission(
    @Request() req: AuthenticatedRequest,
    @Body() dto: TriggerManualSubmissionDto,
  ): Promise<ManualSubmissionResponseDto> {
    return this.submissionsService.runManualSubmission(
      req.user.tenantId,
      req.user.sub,
      req.user.name,
      dto.remarks,
    );
  }

  /**
   * GET /api/v1/ops/submissions/history
   * Get history of manual submission runs
   */
  @Get('history')
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Get manual submission run history' })
  @ApiResponse({ status: 200, description: 'List of submission runs' })
  async getRunHistory(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    return this.submissionsService.getRunHistory(
      req.user.tenantId,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
