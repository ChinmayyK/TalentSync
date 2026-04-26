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
  Request,
  HttpCode,
  HttpStatus,
  OnModuleInit,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SkipRateLimit } from '../../common/rate-limit';
import { ComponentService } from './services/component.service';
import { HealthCheckService } from './services/health-check.service';
import { UptimeService } from './services/uptime.service';
import { IncidentService } from './services/incident.service';
import {
  CreateIncidentDto,
  UpdateIncidentDto,
  AddIncidentUpdateDto,
  OverrideComponentStatusDto,
} from './dto';
import { ComponentStatus } from '@prisma/client';

@ApiTags('system-status')
@Controller('api/v1/status')
export class SystemStatusController implements OnModuleInit {
  constructor(
    @InjectQueue('health-checks') private healthCheckQueue: Queue,
    private componentService: ComponentService,
    private healthCheckService: HealthCheckService,
    private uptimeService: UptimeService,
    private incidentService: IncidentService,
  ) {}

  async onModuleInit() {
    // Schedule recurring health checks every 60 seconds
    await this.healthCheckQueue.upsertJobScheduler(
      'health-check-scheduler',
      { pattern: '*/60 * * * * *' }, // Every 60 seconds
      {
        name: 'health-check',
        data: {},
      },
    );
  }

  // ========================================
  // PUBLIC ENDPOINTS (no auth required)
  // ========================================

  /**
   * GET /api/v1/status
   * Overall system status
   */
  @Get()
  @SkipRateLimit()
  @ApiOperation({ summary: 'Get overall system status' })
  @ApiResponse({ status: 200, description: 'System status overview' })
  async getSystemStatus() {
    const components = await this.componentService.findAllWithStatus();
    const overallUptime = await this.uptimeService.getOverallUptime('90d');
    const activeIncidents = await this.incidentService.getActiveIncidents();

    // Determine overall status from component statuses and active incidents
    let overallStatus: ComponentStatus = ComponentStatus.OPERATIONAL;

    if (activeIncidents.length > 0) {
      const severities = activeIncidents.map((i) => i.severity);
      if (severities.includes('CRITICAL')) {
        overallStatus = ComponentStatus.MAJOR_OUTAGE;
      } else if (severities.includes('MAJOR')) {
        overallStatus = ComponentStatus.PARTIAL_OUTAGE;
      } else {
        overallStatus = ComponentStatus.DEGRADED;
      }
    } else {
      // Check component statuses
      const statuses = components.map((c) => c.currentStatus);
      if (statuses.includes(ComponentStatus.MAJOR_OUTAGE)) {
        overallStatus = ComponentStatus.MAJOR_OUTAGE;
      } else if (statuses.includes(ComponentStatus.PARTIAL_OUTAGE)) {
        overallStatus = ComponentStatus.PARTIAL_OUTAGE;
      } else if (statuses.includes(ComponentStatus.DEGRADED)) {
        overallStatus = ComponentStatus.DEGRADED;
      }
    }

    return {
      status: overallStatus,
      uptimePercentage: overallUptime.uptimePercentage,
      activeIncidentCount: activeIncidents.length,
      componentCount: components.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /api/v1/status/components
   * All components with current status
   */
  @Get('components')
  @SkipRateLimit()
  @ApiOperation({ summary: 'Get all components with current status' })
  @ApiResponse({ status: 200, description: 'List of components with status' })
  async getComponents() {
    return this.componentService.findAllWithStatus();
  }

  /**
   * GET /api/v1/status/uptime/:componentId
   * Uptime data for a specific component
   */
  @Get('uptime/:componentId')
  @SkipRateLimit()
  @ApiOperation({ summary: 'Get uptime data for a component' })
  @ApiQuery({
    name: 'period',
    enum: ['24h', '7d', '30d', '90d'],
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Component uptime data' })
  async getComponentUptime(
    @Param('componentId') componentId: string,
    @Query('period') period: '24h' | '7d' | '30d' | '90d' = '90d',
  ) {
    return this.uptimeService.getUptime(componentId, period);
  }

  /**
   * GET /api/v1/status/incidents
   * Recent incidents (last 7 days)
   */
  @Get('incidents')
  @SkipRateLimit()
  @ApiOperation({ summary: 'Get recent incidents' })
  @ApiQuery({ name: 'days', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'List of recent incidents' })
  async getIncidents(@Query('days') days = 7) {
    return this.incidentService.findRecent(days);
  }

  /**
   * GET /api/v1/status/incidents/:id
   * Single incident details
   */
  @Get('incidents/:id')
  @SkipRateLimit()
  @ApiOperation({ summary: 'Get incident details' })
  @ApiResponse({ status: 200, description: 'Incident details with timeline' })
  async getIncidentById(@Param('id') id: string) {
    return this.incidentService.findById(id);
  }

  /**
   * GET /api/v1/status/incidents-by-date
   * Incidents grouped by date for past incidents display
   */
  @Get('incidents-by-date')
  @SkipRateLimit()
  @ApiOperation({ summary: 'Get incidents grouped by date' })
  @ApiQuery({ name: 'days', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'Incidents grouped by date' })
  async getIncidentsByDate(@Query('days') days = 7) {
    const byDate = await this.incidentService.getIncidentsByDate(days);
    return Object.fromEntries(byDate);
  }

  // ========================================
  // ADMIN ENDPOINTS (auth required)
  // ========================================

  /**
   * POST /api/v1/status/admin/run-checks
   * Manually trigger health checks
   */
  @Post('admin/run-checks')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Manually run health checks' })
  @ApiResponse({ status: 200, description: 'Health check results' })
  async runHealthChecks() {
    return this.healthCheckService.runAllChecks();
  }

  /**
   * POST /api/v1/status/admin/incidents
   * Create a new incident
   */
  @Post('admin/incidents')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Create a new incident' })
  @ApiResponse({ status: 201, description: 'Incident created' })
  async createIncident(
    @Body() dto: CreateIncidentDto,
    @Request() req: { user?: { sub?: string } },
  ) {
    return this.incidentService.create({
      ...dto,
      createdById: req.user?.sub,
    });
  }

  /**
   * PATCH /api/v1/status/admin/incidents/:id
   * Update an incident
   */
  @Patch('admin/incidents/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Update an incident' })
  @ApiResponse({ status: 200, description: 'Incident updated' })
  async updateIncident(
    @Param('id') id: string,
    @Body() dto: UpdateIncidentDto,
  ) {
    return this.incidentService.update(id, dto);
  }

  /**
   * POST /api/v1/status/admin/incidents/:id/updates
   * Add a timeline update to an incident
   */
  @Post('admin/incidents/:id/updates')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Add incident timeline update' })
  @ApiResponse({ status: 201, description: 'Update added' })
  async addIncidentUpdate(
    @Param('id') id: string,
    @Body() dto: AddIncidentUpdateDto,
    @Request() req: { user?: { sub?: string } },
  ) {
    return this.incidentService.addUpdate(id, {
      ...dto,
      createdById: req.user?.sub,
    });
  }

  /**
   * DELETE /api/v1/status/admin/incidents/:id
   * Delete an incident
   */
  @Delete('admin/incidents/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an incident' })
  @ApiResponse({ status: 204, description: 'Incident deleted' })
  async deleteIncident(@Param('id') id: string) {
    await this.incidentService.delete(id);
  }

  /**
   * PATCH /api/v1/status/admin/components/:id/override
   * Override component status manually
   */
  @Patch('admin/components/:id/override')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Override component status' })
  @ApiResponse({ status: 200, description: 'Component status overridden' })
  async overrideComponentStatus(
    @Param('id') id: string,
    @Body() dto: OverrideComponentStatusDto,
    @Request() req: { user?: { sub?: string } },
  ) {
    if (dto.status === null || dto.status === undefined) {
      return this.componentService.clearOverride(id);
    }
    return this.componentService.overrideStatus(
      id,
      dto.status,
      req.user?.sub || 'unknown',
    );
  }

  /**
   * DELETE /api/v1/status/admin/components/:id/override
   * Clear component status override
   */
  @Delete('admin/components/:id/override')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @ApiOperation({ summary: 'Clear component status override' })
  @ApiResponse({ status: 200, description: 'Override cleared' })
  async clearComponentOverride(@Param('id') id: string) {
    return this.componentService.clearOverride(id);
  }
}
