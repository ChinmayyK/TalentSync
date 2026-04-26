import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { UpdateSsoDto } from './dto/update-sso.dto';
import { UpdateSmtpDto } from './dto/update-smtp.dto';
import { CreateApiKeyDto } from './dto/create-apikey.dto';
import { TestSmtpDto } from './dto/test-smtp.dto';
import { encrypt, decrypt } from './utils/encryption.util';
import { generateApiKey, hashApiKey } from './utils/api-key.util';
import * as nodemailer from 'nodemailer';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private prisma: PrismaService) {}

  async getSettings(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const settings = (tenant.settings || {}) as any;

    // Include domain settings from the tenant model
    return {
      ...settings,
      domain: {
        subdomain: tenant.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || '',
        customDomain: tenant.domain || '',
        customDomainVerified: tenant.domainVerified || false,
        customDomainSSLStatus: tenant.domainVerified ? 'verified' : 'pending',
        webhookCallbackURL: `${process.env.API_URL || 'https://api.talentsync.app'}/webhooks/${tenantId}`,
        domainRedirectRules: settings.domainRedirectRules || [],
      },
    };
  }

  async updateDomain(
    tenantId: string,
    userId: string,
    dto: { customDomain?: string; domainRedirectRules?: any[] },
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const settings = (tenant.settings || {}) as any;

    // Update domain redirect rules in settings if provided
    if (dto.domainRedirectRules !== undefined) {
      settings.domainRedirectRules = dto.domainRedirectRules;
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          domain:
            dto.customDomain !== undefined ? dto.customDomain : tenant.domain,
          domainVerified:
            dto.customDomain !== undefined && dto.customDomain !== tenant.domain
              ? false
              : tenant.domainVerified,
          settings,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'SETTINGS_UPDATE_DOMAIN',
          metadata: dto as any,
        },
      }),
    ]);

    return {
      subdomain: updated.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || '',
      customDomain: updated.domain || '',
      customDomainVerified: updated.domainVerified || false,
      customDomainSSLStatus: updated.domainVerified ? 'verified' : 'pending',
      webhookCallbackURL: `${process.env.API_URL || 'https://api.talentsync.app'}/webhooks/${tenantId}`,
      domainRedirectRules: settings.domainRedirectRules || [],
    };
  }

  async updateBranding(
    tenantId: string,
    userId: string,
    dto: UpdateBrandingDto,
  ) {
    const current = await this.getSettings(tenantId);
    const updated = {
      ...current,
      branding: { ...(current['branding'] || {}), ...dto },
    };

    await this.prisma.$transaction([
      this.prisma.tenant.update({
        where: { id: tenantId },
        data: { settings: updated },
      }),
      this.prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'SETTINGS_UPDATE_BRANDING',
          metadata: dto as any,
        },
      }),
    ]);
    return updated.branding;
  }

  async updateSso(tenantId: string, userId: string, dto: UpdateSsoDto) {
    const ssoSettings = { ...dto };
    if (ssoSettings.oauthClientSecret) {
      ssoSettings.oauthClientSecret = encrypt(ssoSettings.oauthClientSecret);
    }

    const current = await this.getSettings(tenantId);
    const updated = {
      ...current,
      sso: { ...(current['sso'] || {}), ...ssoSettings },
    };

    await this.prisma.$transaction([
      this.prisma.tenant.update({
        where: { id: tenantId },
        data: { settings: updated },
      }),
      this.prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'SETTINGS_UPDATE_SSO',
          metadata: { provider: dto.provider },
        },
      }),
    ]);
    return updated.sso;
  }

  async updateSmtp(tenantId: string, userId: string, dto: UpdateSmtpDto) {
    const current = await this.getSettings(tenantId);
    const smtpSettings = { ...dto };
    if (smtpSettings.password) {
      smtpSettings.password = encrypt(smtpSettings.password);
    }
    const smtp = current.smtp || {};
    const updated = { ...current, smtp: { ...smtp, ...smtpSettings } };

    await this.prisma.$transaction([
      this.prisma.tenant.update({
        where: { id: tenantId },
        data: { settings: updated },
      }),
      this.prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'SETTINGS_UPDATE_SMTP',
          metadata: { host: dto.host, user: dto.username },
        },
      }),
    ]);
    return { success: true };
  }

  async testSmtp(tenantId: string, dto: TestSmtpDto) {
    const settings: any = await this.getSettings(tenantId);
    const smtp = settings.smtp;
    if (!smtp) throw new BadRequestException('SMTP not configured');

    let pass = smtp.password;
    try {
      if (pass) pass = decrypt(pass);
    } catch (e) {
      this.logger.warn(
        'Failed to decrypt SMTP password - may be stored unencrypted',
        e,
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: Number(smtp.port),
      secure: smtp.secure === 'true',
      auth: smtp.username ? { user: smtp.username, pass } : undefined,
    });

    try {
      await transporter.sendMail({
        from: smtp.fromAddress || 'noreply@talentsync.com',
        to: dto.to,
        subject: 'TalentSync SMTP Test',
        text: 'This is a test email to verify your SMTP configuration.',
      });

      await this.prisma.auditLog.create({
        data: {
          tenantId,
          action: 'SETTINGS_TEST_SMTP',
          metadata: { to: dto.to, success: true },
        },
      });

      return { success: true };
    } catch (error) {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          action: 'SETTINGS_TEST_SMTP',
          metadata: { to: dto.to, success: false, error: error.message },
        },
      });
      throw new BadRequestException(`SMTP Test Failed: ${error.message}`);
    }
  }

  async createApiKey(tenantId: string, userId: string, dto: CreateApiKeyDto) {
    const plainKey = generateApiKey();
    const hashedKey = await hashApiKey(plainKey);

    const apiKey = await this.prisma.aPIKey.create({
      data: {
        tenantId,
        name: dto.name,
        hashedKey,
        scopes: dto.scopes,
        active: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'API_KEY_CREATE',
        metadata: { apiKeyId: apiKey.id, scopes: dto.scopes },
      },
    });

    return { id: apiKey.id, name: apiKey.name, key: plainKey };
  }

  async listApiKeys(tenantId: string) {
    return this.prisma.aPIKey.findMany({
      where: { tenantId, active: true },
      select: {
        id: true,
        name: true,
        scopes: true,
        active: true,
        createdAt: true,
        lastUsed: true,
      },
    });
  }

  async revokeApiKey(tenantId: string, userId: string, id: string) {
    await this.prisma.aPIKey.updateMany({
      where: { id, tenantId },
      data: { active: false },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'API_KEY_REVOKE',
        metadata: { apiKeyId: id },
      },
    });

    return { success: true };
  }

  // ─── Security Policy ────────────────────────────────────────────────────────

  async getSecurityPolicy(tenantId: string) {
    return (
      this.prisma.tenantSecurityPolicy.findUnique({ where: { tenantId } }) || {}
    );
  }

  async updateSecurityPolicy(tenantId: string, userId: string, dto: any) {
    const policy = await this.prisma.tenantSecurityPolicy.upsert({
      where: { tenantId },
      update: {
        ...dto,
      },
      create: {
        tenantId,
        ...dto,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'SETTINGS_UPDATE_SECURITY',
        metadata: dto,
      },
    });

    return policy;
  }
}
