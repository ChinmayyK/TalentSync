import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import {
  Incident,
  IncidentUpdate,
  IncidentStatus,
  IncidentSeverity,
  ComponentStatus,
} from '@prisma/client';

export interface CreateIncidentDto {
  title: string;
  severity?: IncidentSeverity;
  componentIds: string[];
  impactLevel?: ComponentStatus;
  message: string;
  createdById?: string;
}

export interface UpdateIncidentDto {
  title?: string;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
}

export interface AddIncidentUpdateDto {
  status: IncidentStatus;
  message: string;
  createdById?: string;
}

export interface IncidentWithDetails extends Incident {
  components: {
    id: string;
    key: string;
    name: string;
    impactLevel: ComponentStatus;
  }[];
  updates: IncidentUpdate[];
}

@Injectable()
export class IncidentService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new incident
   */
  async create(dto: CreateIncidentDto): Promise<IncidentWithDetails> {
    const incident = await this.prisma.incident.create({
      data: {
        title: dto.title,
        severity: dto.severity || IncidentSeverity.MINOR,
        status: IncidentStatus.INVESTIGATING,
        createdById: dto.createdById,
        components: {
          create: dto.componentIds.map((componentId) => ({
            componentId,
            impactLevel: dto.impactLevel || ComponentStatus.DEGRADED,
          })),
        },
        updates: {
          create: {
            status: IncidentStatus.INVESTIGATING,
            message: dto.message,
            createdById: dto.createdById,
          },
        },
      },
      include: {
        components: {
          include: {
            component: true,
          },
        },
        updates: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return this.formatIncident(incident);
  }

  /**
   * Get all incidents with optional filters
   */
  async findAll(
    options: {
      status?: IncidentStatus;
      limit?: number;
      includeResolved?: boolean;
    } = {},
  ): Promise<IncidentWithDetails[]> {
    const { status, limit = 50, includeResolved = true } = options;

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    } else if (!includeResolved) {
      where.status = { not: IncidentStatus.RESOLVED };
    }

    const incidents = await this.prisma.incident.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: {
        components: {
          include: { component: true },
        },
        updates: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return incidents.map(this.formatIncident);
  }

  /**
   * Get recent incidents (last 7 days)
   */
  async findRecent(days = 7): Promise<IncidentWithDetails[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const incidents = await this.prisma.incident.findMany({
      where: { startedAt: { gte: since } },
      orderBy: { startedAt: 'desc' },
      include: {
        components: {
          include: { component: true },
        },
        updates: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return incidents.map(this.formatIncident);
  }

  /**
   * Get a single incident by ID
   */
  async findById(id: string): Promise<IncidentWithDetails | null> {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
      include: {
        components: {
          include: { component: true },
        },
        updates: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return incident ? this.formatIncident(incident) : null;
  }

  /**
   * Update an incident
   */
  async update(
    id: string,
    dto: UpdateIncidentDto,
  ): Promise<IncidentWithDetails> {
    const updateData: Record<string, unknown> = {};

    if (dto.title) updateData.title = dto.title;
    if (dto.severity) updateData.severity = dto.severity;
    if (dto.status) {
      updateData.status = dto.status;
      if (dto.status === IncidentStatus.RESOLVED) {
        updateData.resolvedAt = new Date();
      }
    }

    const incident = await this.prisma.incident.update({
      where: { id },
      data: updateData,
      include: {
        components: {
          include: { component: true },
        },
        updates: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return this.formatIncident(incident);
  }

  /**
   * Add a timeline update to an incident
   */
  async addUpdate(
    incidentId: string,
    dto: AddIncidentUpdateDto,
  ): Promise<IncidentWithDetails> {
    // Create the update
    await this.prisma.incidentUpdate.create({
      data: {
        incidentId,
        status: dto.status,
        message: dto.message,
        createdById: dto.createdById,
      },
    });

    // Update incident status
    const updateData: Record<string, unknown> = { status: dto.status };
    if (dto.status === IncidentStatus.RESOLVED) {
      updateData.resolvedAt = new Date();
    }

    const incident = await this.prisma.incident.update({
      where: { id: incidentId },
      data: updateData,
      include: {
        components: {
          include: { component: true },
        },
        updates: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return this.formatIncident(incident);
  }

  /**
   * Delete an incident
   */
  async delete(id: string): Promise<void> {
    await this.prisma.incident.delete({ where: { id } });
  }

  /**
   * Get active incidents (not resolved)
   */
  async getActiveIncidents(): Promise<IncidentWithDetails[]> {
    return this.findAll({ includeResolved: false });
  }

  /**
   * Get incidents by date for past incidents display
   */
  async getIncidentsByDate(
    days = 7,
  ): Promise<Map<string, IncidentWithDetails[]>> {
    const incidents = await this.findRecent(days);
    const byDate = new Map<string, IncidentWithDetails[]>();

    // Initialize all days
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      byDate.set(dateStr, []);
    }

    // Group incidents by date
    for (const incident of incidents) {
      const dateStr = incident.startedAt.toISOString().split('T')[0];
      const existing = byDate.get(dateStr) || [];
      existing.push(incident);
      byDate.set(dateStr, existing);
    }

    return byDate;
  }

  private formatIncident(incident: {
    id: string;
    title: string;
    status: IncidentStatus;
    severity: IncidentSeverity;
    startedAt: Date;
    resolvedAt: Date | null;
    createdById: string | null;
    createdAt: Date;
    updatedAt: Date;
    components: {
      componentId: string;
      impactLevel: ComponentStatus;
      component: { id: string; key: string; name: string };
    }[];
    updates: IncidentUpdate[];
  }): IncidentWithDetails {
    return {
      ...incident,
      components: incident.components.map((c) => ({
        id: c.component.id,
        key: c.component.key,
        name: c.component.name,
        impactLevel: c.impactLevel,
      })),
    };
  }
}
