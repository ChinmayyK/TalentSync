import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApprovalsService } from './approvals.service';
import {
  ApproveRejectDto,
  BulkApproveRejectDto,
  QueryApprovalsDto,
} from './dto';

interface AuthenticatedRequest {
  user: {
    sub: string;
    tenantId: string;
    email?: string;
  };
}

@ApiTags('ops-approvals')
@Controller('api/v1/ops/approvals')
@UseGuards(JwtAuthGuard, RbacGuard)
@Roles('ADMIN', 'SUPERADMIN')
export class ApprovalsController {
  constructor(private approvalsService: ApprovalsService) {}

  /**
   * GET /api/v1/ops/approvals/pending
   * List all pending approval requests
   */
  @Get('pending')
  @ApiOperation({ summary: 'Get pending approval requests' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'List of pending approvals' })
  async getPending(
    @Request() req: AuthenticatedRequest,
    @Query() query: QueryApprovalsDto,
  ) {
    return this.approvalsService.getPending({
      tenantId: req.user.tenantId,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  /**
   * GET /api/v1/ops/approvals/missed
   * List approval requests where interview date has passed but still pending
   */
  @Get('missed')
  @ApiOperation({ summary: 'Get missed approval requests' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of missed approvals' })
  async getMissed(
    @Request() req: AuthenticatedRequest,
    @Query() query: QueryApprovalsDto,
  ) {
    return this.approvalsService.getMissed({
      tenantId: req.user.tenantId,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  /**
   * GET /api/v1/ops/approvals/stats
   * Get approval statistics for dashboard
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get approval statistics' })
  @ApiResponse({ status: 200, description: 'Approval statistics' })
  async getStats(@Request() req: AuthenticatedRequest) {
    return this.approvalsService.getStats(req.user.tenantId);
  }

  /**
   * GET /api/v1/ops/approvals/:id
   * Get a single approval request
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get approval request by ID' })
  @ApiResponse({ status: 200, description: 'Approval request details' })
  async getById(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const request = await this.approvalsService.getById(id, req.user.tenantId);
    if (!request) {
      throw new NotFoundException('Approval request not found');
    }
    return request;
  }

  /**
   * POST /api/v1/ops/approvals/:id/approve
   * Approve a request
   */
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a request' })
  @ApiResponse({ status: 200, description: 'Request approved' })
  async approve(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ApproveRejectDto,
  ) {
    try {
      return await this.approvalsService.approve(id, req.user.tenantId, {
        userId: req.user.sub,
        remarks: dto.remarks,
      });
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to approve',
      );
    }
  }

  /**
   * POST /api/v1/ops/approvals/:id/reject
   * Reject a request
   */
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a request' })
  @ApiResponse({ status: 200, description: 'Request rejected' })
  async reject(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ApproveRejectDto,
  ) {
    try {
      return await this.approvalsService.reject(id, req.user.tenantId, {
        userId: req.user.sub,
        remarks: dto.remarks,
      });
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to reject',
      );
    }
  }

  /**
   * POST /api/v1/ops/approvals/bulk/approve
   * Bulk approve requests
   */
  @Post('bulk/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk approve requests' })
  @ApiResponse({ status: 200, description: 'Requests approved' })
  async bulkApprove(
    @Request() req: AuthenticatedRequest,
    @Body() dto: BulkApproveRejectDto,
  ) {
    return this.approvalsService.bulkApprove(dto.ids, req.user.tenantId, {
      userId: req.user.sub,
      remarks: dto.remarks,
    });
  }

  /**
   * POST /api/v1/ops/approvals/bulk/reject
   * Bulk reject requests
   */
  @Post('bulk/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk reject requests' })
  @ApiResponse({ status: 200, description: 'Requests rejected' })
  async bulkReject(
    @Request() req: AuthenticatedRequest,
    @Body() dto: BulkApproveRejectDto,
  ) {
    return this.approvalsService.bulkReject(dto.ids, req.user.tenantId, {
      userId: req.user.sub,
      remarks: dto.remarks,
    });
  }

  /**
   * POST /api/v1/ops/approvals/bulk/approve-all
   * Approve ALL pending and missed requests at once
   */
  @Post('bulk/approve-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve all pending and missed requests' })
  @ApiResponse({
    status: 200,
    description: 'All pending and missed requests approved',
  })
  async approveAllPendingAndMissed(
    @Request() req: AuthenticatedRequest,
    @Body() dto: ApproveRejectDto,
  ) {
    return this.approvalsService.approveAllPendingAndMissed(req.user.tenantId, {
      userId: req.user.sub,
      remarks: dto.remarks,
    });
  }
}
