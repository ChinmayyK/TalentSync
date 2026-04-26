import {
  Controller,
  Get,
  Post,
  Delete,
  UseGuards,
  Req,
  Res,
  Query,
  Param,
  Body,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateScheduledReportDto,
  ReportType,
} from './dto/scheduled-report.dto';
import { RateLimited, RateLimitProfile } from '../../common/rate-limit';

import { GetReportDto } from './dto/get-report.dto';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';

@ApiTags('reports')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/reports')
@UseGuards(JwtAuthGuard, RbacGuard)
@RateLimited(RateLimitProfile.REPORT)
export class ReportsController {
  constructor(private svc: ReportsService) {}

  // ─── Core Reports ────────────────────────────────────────────────────────────

  @Get('summary')
  @Roles('MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Get dashboard summary metrics' })
  @ApiResponse({ status: 200, type: DashboardSummaryDto })
  summary(@Req() req: any) {
    return this.svc.getDashboardSummary(req.user.tenantId);
  }

  @Get('overview')
  @Roles('MANAGER', 'ADMIN')
  @ApiOperation({
    summary:
      'Get overview report with funnel, time-to-hire, and interviewer load',
  })
  @ApiQuery({
    name: 'refresh',
    required: false,
    description: 'Force refresh cached data',
  })
  @ApiResponse({ status: 200, description: 'Overview report data' })
  overview(@Req() req: any, @Query('refresh') refresh?: string) {
    return this.svc.overview(req.user.tenantId, refresh === 'true');
  }

  @Get('funnel')
  @Roles('MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Get candidate funnel/stage breakdown' })
  @ApiQuery({
    name: 'refresh',
    required: false,
    description: 'Force refresh cached data',
  })
  @ApiResponse({ status: 200, description: 'Funnel data by hiring stage' })
  funnel(
    @Req() req: any,
    @Query() filters: GetReportDto,
    @Query('refresh') refresh?: string,
  ) {
    return this.svc.funnel(req.user.tenantId, filters, refresh === 'true');
  }

  @Get('time-to-hire-trend')
  @Roles('MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Get time-to-hire trend data' })
  @ApiQuery({
    name: 'refresh',
    required: false,
    description: 'Force refresh cached data',
  })
  @ApiResponse({ status: 200, description: 'Time-to-hire trend statistics' })
  timeToHireTrend(@Req() req: any, @Query('refresh') refresh?: string) {
    return this.svc.timeToHireTrend(req.user.tenantId, refresh === 'true');
  }

  @Get('stage-duration')
  @Roles('MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Get average duration per hiring stage' })
  @ApiQuery({
    name: 'refresh',
    required: false,
    description: 'Force refresh cached data',
  })
  @ApiResponse({ status: 200, description: 'Stage duration metrics' })
  stageDuration(@Req() req: any, @Query('refresh') refresh?: string) {
    return this.svc.stageDuration(req.user.tenantId, refresh === 'true');
  }

  @Get('offer-breakdown')
  @Roles('MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Get offer acceptance/rejection breakdown' })
  @ApiQuery({
    name: 'refresh',
    required: false,
    description: 'Force refresh cached data',
  })
  @ApiResponse({ status: 200, description: 'Offer breakdown statistics' })
  offerBreakdown(@Req() req: any, @Query('refresh') refresh?: string) {
    return this.svc.offerBreakdown(req.user.tenantId, refresh === 'true');
  }

  @Get('interviewer-load')
  @Roles('MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Get interviewer workload distribution' })
  @ApiQuery({
    name: 'refresh',
    required: false,
    description: 'Force refresh cached data',
  })
  @ApiResponse({
    status: 200,
    description: 'Interviewer load metrics per user',
  })
  interviewerLoad(
    @Req() req: any,
    @Query() filters: GetReportDto,
    @Query('refresh') refresh?: string,
  ) {
    return this.svc.interviewerLoad(
      req.user.tenantId,
      filters,
      refresh === 'true',
    );
  }

  @Get('source-performance')
  @Roles('MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Get source effectiveness report' })
  @ApiQuery({
    name: 'refresh',
    required: false,
    description: 'Force refresh cached data',
  })
  @ApiResponse({ status: 200, description: 'Source performance metrics' })
  sourcePerformance(
    @Req() req: any,
    @Query() filters: GetReportDto,
    @Query('refresh') refresh?: string,
  ) {
    return this.svc.sourcePerformance(
      req.user.tenantId,
      filters,
      refresh === 'true',
    );
  }

  // ─── Export Endpoints ────────────────────────────────────────────────────────

  @Get('export/csv/:type')
  @Roles('MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Export report as CSV file' })
  @ApiParam({ name: 'type', enum: ReportType })
  async exportCsv(
    @Req() req: any,
    @Res() res: Response,
    @Param('type') type: ReportType,
    @Query() filters: GetReportDto,
  ) {
    const { filename, content } = await this.svc.exportToCsv(
      req.user.tenantId,
      type,
      filters,
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
  }

  @Get('export/pdf/:type')
  @Roles('MANAGER', 'ADMIN')
  @ApiOperation({
    summary:
      'Export report as PDF (returns HTML for client-side PDF generation)',
  })
  @ApiParam({ name: 'type', enum: ReportType })
  async exportPdf(
    @Req() req: any,
    @Res() res: Response,
    @Param('type') type: ReportType,
    @Query() filters: GetReportDto,
  ) {
    const { filename, html } = await this.svc.exportToPdf(
      req.user.tenantId,
      type,
      filters,
    );
    // Return HTML that can be converted to PDF on client side using html2pdf or similar
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('X-Filename', filename);
    res.send(html);
  }

  // ─── Scheduled Reports ───────────────────────────────────────────────────────

  @Post('schedules')
  @Roles('MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Create a scheduled report' })
  @ApiBody({ type: CreateScheduledReportDto })
  @ApiResponse({ status: 201, description: 'Scheduled report created' })
  createSchedule(@Req() req: any, @Body() dto: CreateScheduledReportDto) {
    return this.svc.createScheduledReport(req.user.tenantId, req.user.sub, dto);
  }

  @Get('schedules')
  @Roles('MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'List all scheduled reports for tenant' })
  listSchedules(@Req() req: any) {
    return this.svc.listScheduledReports(req.user.tenantId);
  }

  @Get('schedules/:id')
  @Roles('MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Get a specific scheduled report' })
  getSchedule(@Req() req: any, @Param('id') id: string) {
    return this.svc.getScheduledReport(req.user.tenantId, id);
  }

  @Delete('schedules/:id')
  @Roles('MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Delete a scheduled report' })
  deleteSchedule(@Req() req: any, @Param('id') id: string) {
    return this.svc.deleteScheduledReport(req.user.tenantId, req.user.sub, id);
  }

  @Post('schedules/:id/toggle')
  @Roles('MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Toggle scheduled report active/inactive' })
  toggleSchedule(@Req() req: any, @Param('id') id: string) {
    return this.svc.toggleScheduledReport(req.user.tenantId, req.user.sub, id);
  }
}
