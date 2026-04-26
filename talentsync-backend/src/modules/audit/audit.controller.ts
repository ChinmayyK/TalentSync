import { Controller, Get, Query, Res, UseGuards, Req } from '@nestjs/common';
import type { Response } from 'express';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('api/v1/audit')
export class AuditController {
  constructor(private svc: AuditService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'List audit logs for tenant' })
  @ApiQuery({ name: 'user', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'perPage', required: false })
  findAll(
    @Req() req: any,
    @Query('user') user?: string,
    @Query('action') action?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    const pageNum = parseInt(page || '1', 10) || 1;
    const perPageNum = parseInt(perPage || '50', 10) || 50;
    return this.svc.findAll(req.user.tenantId, {
      user,
      action,
      dateFrom,
      dateTo,
      page: pageNum,
      perPage: perPageNum,
    });
  }

  @Get('export/csv')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Export audit logs as CSV' })
  async exportCSV(@Req() req: any, @Res() res: Response) {
    const { csv, filename } = await this.svc.exportCSV(req.user.tenantId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
