import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { SystemComponent, ComponentStatus } from '@prisma/client';

export interface ComponentWithStatus extends SystemComponent {
  currentStatus: ComponentStatus;
  lastCheckedAt: Date | null;
  lastLatencyMs: number | null;
}

// Default components to seed on first run
const DEFAULT_COMPONENTS = [
  {
    key: 'api',
    name: 'API Server',
    description: 'Backend REST API',
    category: 'core',
    order: 1,
  },
  {
    key: 'database',
    name: 'Database',
    description: 'PostgreSQL database',
    category: 'core',
    order: 2,
  },
  {
    key: 'redis',
    name: 'Cache & Queue',
    description: 'Redis cache and job queue',
    category: 'core',
    order: 3,
  },
  {
    key: 'calendar',
    name: 'Calendar Service',
    description: 'Calendar sync and scheduling',
    category: 'communication',
    order: 4,
  },
  {
    key: 'communication',
    name: 'Communication Service',
    description: 'Email, SMS, and WhatsApp',
    category: 'communication',
    order: 5,
  },
  {
    key: 'integrations',
    name: 'Integration Services',
    description: 'Zoho, Salesforce, HubSpot',
    category: 'integration',
    order: 6,
  },
];

@Injectable()
export class ComponentService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    // Seed default components if none exist
    const count = await this.prisma.systemComponent.count();
    if (count === 0) {
      await this.seedDefaultComponents();
    }
  }

  private async seedDefaultComponents(): Promise<void> {
    await this.prisma.systemComponent.createMany({
      data: DEFAULT_COMPONENTS,
      skipDuplicates: true,
    });
  }

  async findAll(): Promise<SystemComponent[]> {
    return this.prisma.systemComponent.findMany({
      where: { isMonitored: true },
      orderBy: { order: 'asc' },
    });
  }

  async findAllWithStatus(): Promise<ComponentWithStatus[]> {
    const components = await this.prisma.systemComponent.findMany({
      where: { isMonitored: true },
      orderBy: { order: 'asc' },
      include: {
        healthChecks: {
          orderBy: { checkedAt: 'desc' },
          take: 1,
        },
      },
    });

    return components.map((c) => {
      const lastCheck = c.healthChecks[0];
      return {
        ...c,
        healthChecks: undefined, // Remove from output
        currentStatus:
          c.statusOverride || lastCheck?.status || ComponentStatus.OPERATIONAL,
        lastCheckedAt: lastCheck?.checkedAt || null,
        lastLatencyMs: lastCheck?.latencyMs || null,
      } as ComponentWithStatus;
    });
  }

  async findByKey(key: string): Promise<SystemComponent | null> {
    return this.prisma.systemComponent.findUnique({ where: { key } });
  }

  async findById(id: string): Promise<SystemComponent | null> {
    return this.prisma.systemComponent.findUnique({ where: { id } });
  }

  async overrideStatus(
    id: string,
    status: ComponentStatus | null,
    overrideBy: string,
  ): Promise<SystemComponent> {
    return this.prisma.systemComponent.update({
      where: { id },
      data: {
        statusOverride: status,
        statusOverrideBy: status ? overrideBy : null,
        statusOverrideAt: status ? new Date() : null,
      },
    });
  }

  async clearOverride(id: string): Promise<SystemComponent> {
    return this.overrideStatus(id, null, '');
  }
}
