import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateIdentityProviderDto } from './dto/create-identity-provider.dto';
import { UpdateIdentityProviderDto } from './dto/update-identity-provider.dto';

// Roles that can manage identity providers
const SUPERADMIN_ROLES = ['SUPERADMIN', 'SUPPORT'];
const ADMIN_ROLES = ['ADMIN', ...SUPERADMIN_ROLES];

@Injectable()
export class IdentityProviderService {
  constructor(private prisma: PrismaService) {}

  /**
   * List all identity providers for a tenant
   */
  async findAll(tenantId: string) {
    return this.prisma.identityProvider.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single identity provider by ID
   */
  async findOne(tenantId: string, id: string) {
    const provider = await this.prisma.identityProvider.findUnique({
      where: { id },
    });

    if (!provider || provider.tenantId !== tenantId) {
      throw new NotFoundException('Identity provider not found');
    }

    return provider;
  }

  /**
   * Find provider by type for a tenant
   */
  async findByType(tenantId: string, providerType: string) {
    return this.prisma.identityProvider.findUnique({
      where: {
        tenantId_providerType: {
          tenantId,
          providerType: providerType as any,
        },
      },
    });
  }

  /**
   * Find enabled provider for a tenant
   */
  async findEnabledProvider(tenantId: string, providerType?: string) {
    const where: any = { tenantId, enabled: true };
    if (providerType) where.providerType = providerType;

    return this.prisma.identityProvider.findFirst({ where });
  }

  /**
   * Omit sensitive fields from identity provider responses
   */
  private sanitizeProvider(provider: any) {
    if (!provider) return provider;
    const { clientSecret, samlCertificate, ...safe } = provider;
    return {
      ...safe,
      hasSecret: !!clientSecret,
      hasCertificate: !!samlCertificate,
    };
  }

  /**
   * Create a new identity provider configuration
   * Only Tenant SuperAdmin can create
   */
  async create(
    tenantId: string,
    userId: string,
    userRole: string,
    dto: CreateIdentityProviderDto,
  ) {
    // Only admins can create providers
    if (!ADMIN_ROLES.includes(userRole)) {
      throw new ForbiddenException('Only administrators can configure SSO');
    }

    // Check if provider type already exists for tenant
    const existing = await this.findByType(tenantId, dto.providerType);
    if (existing) {
      throw new ForbiddenException(
        `Provider ${dto.providerType} already configured for this tenant`,
      );
    }

    const provider = await this.prisma.identityProvider.create({
      data: {
        tenantId,
        providerType: dto.providerType as any,
        clientId: dto.clientId,
        clientSecret: dto.clientSecret,
        redirectUri: dto.redirectUri,
        domainRestriction: dto.domainRestriction,
        samlMetadataUrl: dto.samlMetadataUrl,
        samlEntityId: dto.samlEntityId,
        samlCertificate: dto.samlCertificate,
        samlAcsUrl: dto.samlAcsUrl,
        samlSsoUrl: dto.samlSsoUrl,
        samlLogoutUrl: dto.samlLogoutUrl,
        autoProvision: dto.autoProvision ?? false,
        enabled: dto.enabled ?? false,
        createdById: userId,
      },
    });

    return this.sanitizeProvider(provider);
  }

  /**
   * Update an identity provider configuration
   * Only Tenant SuperAdmin can update
   */
  async update(
    tenantId: string,
    userId: string,
    userRole: string,
    id: string,
    dto: UpdateIdentityProviderDto,
  ) {
    // Only admins can update providers
    if (!ADMIN_ROLES.includes(userRole)) {
      throw new ForbiddenException(
        'Only administrators can modify SSO configuration',
      );
    }

    // Verify provider exists and belongs to tenant
    await this.findOne(tenantId, id);

    const provider = await this.prisma.identityProvider.update({
      where: { id },
      data: {
        ...dto,
        updatedById: userId,
      },
    });

    return this.sanitizeProvider(provider);
  }

  /**
   * Delete an identity provider configuration
   * Only Tenant SuperAdmin can delete
   */
  async delete(tenantId: string, userRole: string, id: string) {
    // Only admins can delete providers
    if (!ADMIN_ROLES.includes(userRole)) {
      throw new ForbiddenException(
        'Only administrators can remove SSO configuration',
      );
    }

    // Verify provider exists and belongs to tenant
    await this.findOne(tenantId, id);

    await this.prisma.identityProvider.delete({ where: { id } });
    return { success: true, message: 'Provider deleted' };
  }

  /**
   * Toggle provider enabled state
   */
  async toggleEnabled(
    tenantId: string,
    userId: string,
    userRole: string,
    id: string,
    enabled: boolean,
  ) {
    if (!ADMIN_ROLES.includes(userRole)) {
      throw new ForbiddenException('Only administrators can toggle SSO');
    }

    await this.findOne(tenantId, id);

    return this.prisma.identityProvider.update({
      where: { id },
      data: { enabled, updatedById: userId },
    });
  }
}
