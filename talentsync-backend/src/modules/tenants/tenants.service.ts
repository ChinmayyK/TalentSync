import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';

@Injectable()
export class TenantsService {
  // Rate limiting for domain verification
  private domainVerifyRateLimiter = new Map<
    string,
    { count: number; resetAt: number }
  >();

  constructor(
    private prisma: PrismaService,
    @InjectQueue('domain-verification') private domainQueue: Queue,
  ) {}

  async create(dto: CreateTenantDto, userId: string) {
    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        domain: dto.domain,
        settings: dto.settings || {},
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        userId,
        action: 'TENANT_CREATE',
        metadata: { name: tenant.name },
      },
    });

    return tenant;
  }

  async findAll() {
    return this.prisma.tenant.findMany({ take: 100 });
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto, userId: string) {
    const tenant = await this.findOne(id);
    const updated = await this.prisma.tenant.update({
      where: { id },
      data: {
        ...dto,
        settings: dto.settings
          ? { ...(tenant.settings as object), ...dto.settings }
          : (tenant.settings as any),
      },
    });
    await this.prisma.auditLog.create({
      data: {
        tenantId: id,
        userId,
        action: 'TENANT_UPDATE',
        metadata: dto as any,
      },
    });
    return updated;
  }

  async generateDomainVerificationToken(tenantId: string, domain: string) {
    // Rate limiting: max 3 verification attempts per hour per tenant
    const now = Date.now();
    const limit = this.domainVerifyRateLimiter.get(tenantId);
    if (limit && limit.resetAt > now) {
      if (limit.count >= 3) {
        throw new BadRequestException(
          'Rate limit exceeded: max 3 domain verifications per hour',
        );
      }
      limit.count++;
    } else {
      this.domainVerifyRateLimiter.set(tenantId, {
        count: 1,
        resetAt: now + 3600000,
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const tenant = await this.findOne(tenantId);
    const settings: any = tenant.settings || {};
    settings.domainVerification = { token, expiresAt, domain };

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings },
    });

    // Enqueue job
    await this.domainQueue.add(
      'verify',
      { tenantId, domain, token },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    return {
      token,
      instructions: {
        dns: `Add TXT record for _talentsync-verification.${domain} with value: ${token}`,
        http: `Upload file to https://${domain}/.well-known/talentsync-verification.txt with content: ${token}`,
      },
    };
  }

  async verifyDomain(tenantId: string, token: string) {
    const tenant = await this.findOne(tenantId);
    const settings: any = tenant.settings || {};
    const verifyConfig = settings.domainVerification;

    if (!verifyConfig || verifyConfig.token !== token) {
      throw new BadRequestException('Invalid verification token');
    }

    if (new Date() > new Date(verifyConfig.expiresAt)) {
      throw new BadRequestException('Verification token expired');
    }

    delete settings.domainVerification;

    await this.prisma.$transaction([
      this.prisma.tenant.update({
        where: { id: tenantId },
        data: { domainVerified: true, settings } as any,
      }),
      this.prisma.auditLog.create({
        data: {
          tenantId,
          action: 'DOMAIN_VERIFICATION_MANUAL_SUCCESS',
          metadata: { domain: tenant.domain },
        },
      }),
    ]);

    return { success: true };
  }

  /**
   * Get all tenants a user belongs to with their role in each
   */
  async getTenantsForUser(userId: string) {
    const userTenants = await this.prisma.userTenant.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            domain: true,
            brandingLogoUrl: true,
            brandingColors: true,
            trialActive: true,
            trialEndsAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return userTenants.map((ut) => ({
      id: ut.tenant.id,
      name: ut.tenant.name,
      domain: ut.tenant.domain,
      role: ut.role,
      brandingLogoUrl: ut.tenant.brandingLogoUrl,
      brandingColors: ut.tenant.brandingColors,
      trialActive: ut.tenant.trialActive,
      trialEndsAt: ut.tenant.trialEndsAt,
    }));
  }

  /**
   * Get tenant branding (public endpoint for invite flows)
   */
  async getBranding(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        brandingLogoUrl: true,
        brandingColors: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  /**
   * Validate branding color format
   */
  private isValidHexColor(color: string): boolean {
    return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
  }

  /**
   * Update tenant branding
   */
  async updateBranding(
    tenantId: string,
    userId: string,
    branding: { logoUrl?: string; colors?: Record<string, string> },
  ) {
    const tenant = await this.findOne(tenantId);

    // Validate color format if provided
    if (branding.colors) {
      for (const [key, value] of Object.entries(branding.colors)) {
        if (!this.isValidHexColor(value)) {
          throw new BadRequestException(
            `Invalid color format for ${key}: ${value}. Use hex format like #fff or #ffffff`,
          );
        }
      }
    }

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        brandingLogoUrl:
          branding.logoUrl !== undefined
            ? branding.logoUrl
            : tenant.brandingLogoUrl,
        brandingColors:
          branding.colors !== undefined
            ? (branding.colors as any)
            : (tenant.brandingColors as any),
      },
      select: {
        id: true,
        name: true,
        brandingLogoUrl: true,
        brandingColors: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'TENANT_BRANDING_UPDATE',
        metadata: branding as any,
      },
    });

    return updated;
  }
}
