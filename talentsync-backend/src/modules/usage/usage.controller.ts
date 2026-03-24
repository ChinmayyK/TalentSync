import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Res,
  Header,
  ForbiddenException,
  Request,
} from '@nestjs/common';
import type { Response } from 'express';
import { UsageService } from './usage.service';
import type { TenantPlan } from './usage.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('api/v1/admin/usage')
@UseGuards(JwtAuthGuard, RbacGuard)
@Roles('ADMIN', 'SUPERADMIN')
export class UsageController {
  constructor(private usageService: UsageService) {}

  /**
   * GET /api/v1/admin/usage/:tenantId/monthly
   * Get monthly usage summary for a tenant
   */
  @Get(':tenantId/monthly')
  async getMonthlyUsage(
    @Request() req: any,
    @Param('tenantId') tenantId: string,
    @Query('month') month?: string,
  ) {
    // Authorization: ADMIN can only see own tenant, SUPERADMIN can see any
    if (req.user.role !== 'SUPERADMIN' && req.user.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied to this tenant');
    }
    const targetMonth = month || this.getCurrentMonth();
    return this.usageService.getMonthlyUsage(tenantId, targetMonth);
  }

  /**
   * GET /api/v1/admin/usage/:tenantId/history
   * Get usage history for last N months
   */
  @Get(':tenantId/history')
  async getUsageHistory(
    @Request() req: any,
    @Param('tenantId') tenantId: string,
    @Query('months') months?: string,
  ) {
    if (req.user.role !== 'SUPERADMIN' && req.user.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied to this tenant');
    }
    const numMonths = Math.min(parseInt(months || '6', 10) || 6, 24); // Default 6, max 24
    return this.usageService.getUsageHistory(tenantId, numMonths);
  }

  /**
   * GET /api/v1/admin/usage/:tenantId/plan
   * Get tenant plan metadata
   */
  @Get(':tenantId/plan')
  async getTenantPlan(
    @Request() req: any,
    @Param('tenantId') tenantId: string,
  ) {
    if (req.user.role !== 'SUPERADMIN' && req.user.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied to this tenant');
    }
    return this.usageService.getTenantPlan(tenantId);
  }

  /**
   * PATCH /api/v1/admin/usage/:tenantId/plan
   * Update tenant plan (no enforcement)
   */
  @Patch(':tenantId/plan')
  @Roles('SUPERADMIN')
  async updateTenantPlan(
    @Param('tenantId') tenantId: string,
    @Body() plan: TenantPlan,
  ) {
    return this.usageService.updateTenantPlan(tenantId, plan);
  }

  /**
   * GET /api/v1/admin/usage/:tenantId/export
   * Export usage data as CSV
   */
  @Get(':tenantId/export')
  @Header('Content-Type', 'text/csv')
  async exportUsage(
    @Request() req: any,
    @Param('tenantId') tenantId: string,
    @Res() res: Response,
    @Query('months') months?: string,
  ) {
    if (req.user.role !== 'SUPERADMIN' && req.user.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied to this tenant');
    }
    const numMonths = Math.min(parseInt(months || '12', 10) || 12, 36); // Default 12, max 36
    const csv = await this.usageService.exportUsageCsv(tenantId, numMonths);

    // Sanitize tenantId for filename
    const safeTenantId = tenantId.replace(/[^a-zA-Z0-9-_]/g, '_');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="usage-${safeTenantId}-${this.getCurrentMonth()}.csv"`,
    );
    res.send(csv);
  }

  /**
   * GET /api/v1/admin/usage/all
   * Get usage summary for all tenants (current month)
   */
  @Get('all')
  @Roles('SUPERADMIN')
  async getAllTenantsUsage(@Query('month') month?: string) {
    const targetMonth = month || this.getCurrentMonth();
    return this.usageService.getAllTenantsUsage(targetMonth);
  }

  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}

