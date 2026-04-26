import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { IdentityProviderService } from '../identity-provider/identity-provider.service';
import { MockSAMLProvider } from './providers/mock-saml.provider';
import { MockGoogleProvider } from './providers/mock-google.provider';
import { MockMicrosoftProvider } from './providers/mock-microsoft.provider';
import { InitiateSSODto } from './dto/initiate-sso.dto';
import { SSOCallbackDto } from './dto/sso-callback.dto';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

// MintSkill platform superadmin roles - must NEVER use tenant SSO
const PLATFORM_ADMIN_ROLES = ['SUPERADMIN', 'SUPPORT'];

interface SSOUserClaims {
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

@Injectable()
export class SSOService {
  constructor(
    private prisma: PrismaService,
    private identityProviderService: IdentityProviderService,
  ) {}

  /**
   * Initiate SSO flow for a tenant
   * Returns mock redirect URL (no real OAuth/SAML redirect)
   */
  async initiate(
    tenantId: string,
    callerRole: string | undefined,
    dto: InitiateSSODto,
  ) {
    // CRITICAL: Block platform superadmins from using tenant SSO
    if (callerRole && PLATFORM_ADMIN_ROLES.includes(callerRole.toUpperCase())) {
      throw new ForbiddenException(
        'Platform administrators must use platform login, not tenant SSO',
      );
    }

    // Verify tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Find enabled provider (specific or any)
    const provider = dto.provider
      ? await this.identityProviderService.findByType(tenantId, dto.provider)
      : await this.identityProviderService.findEnabledProvider(tenantId);

    if (!provider) {
      throw new BadRequestException(
        'No SSO provider configured for this tenant',
      );
    }

    if (!provider.enabled) {
      throw new BadRequestException('SSO provider is not enabled');
    }

    // Generate mock redirect URL based on provider type
    let redirectUrl: string;

    switch (provider.providerType) {
      case 'SAML':
        redirectUrl = MockSAMLProvider.generateAuthRequest({
          samlSsoUrl: provider.samlSsoUrl || undefined,
          samlEntityId: provider.samlEntityId || undefined,
          samlAcsUrl: provider.samlAcsUrl || undefined,
        });
        break;

      case 'GOOGLE':
        redirectUrl = MockGoogleProvider.generateAuthUrl({
          clientId: provider.clientId || undefined,
          redirectUri: provider.redirectUri || undefined,
          state: `tenant:${tenantId}`,
        });
        break;

      case 'MICROSOFT':
        redirectUrl = MockMicrosoftProvider.generateAuthUrl({
          clientId: provider.clientId || undefined,
          redirectUri: provider.redirectUri || undefined,
          state: `tenant:${tenantId}`,
        });
        break;

      default:
        throw new BadRequestException('Unknown provider type');
    }

    return {
      redirectUrl,
      provider: provider.providerType,
      tenant: tenantId,
      mock: true, // Indicate this is mock mode
    };
  }

  /**
   * Handle SSO callback (mock implementation)
   * No real token exchange - uses stub data
   */
  async callback(tenantId: string, dto: SSOCallbackDto) {
    // Verify tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Determine provider type from callback data
    const providerType = dto.SAMLResponse ? 'SAML' : dto.provider || 'GOOGLE';

    // Get provider config
    const provider = await this.identityProviderService.findByType(
      tenantId,
      providerType,
    );
    if (!provider || !provider.enabled) {
      throw new BadRequestException('SSO provider not found or disabled');
    }

    // Extract user claims using mock providers
    let claims: SSOUserClaims;

    switch (provider.providerType) {
      case 'SAML':
        const samlClaims = MockSAMLProvider.parseSAMLResponse(
          dto.SAMLResponse || dto.code,
        );
        claims = {
          email: samlClaims.email,
          firstName: samlClaims.firstName,
          lastName: samlClaims.lastName,
        };
        break;

      case 'GOOGLE':
        const googleTokens = await MockGoogleProvider.exchangeCodeForToken(
          dto.code,
          {
            clientId: provider.clientId || undefined,
            clientSecret: provider.clientSecret || undefined,
            redirectUri: provider.redirectUri || undefined,
          },
        );
        const googleUser = await MockGoogleProvider.fetchUserInfo(
          googleTokens.access_token,
        );
        claims = {
          email: googleUser.email,
          name: googleUser.name,
        };
        break;

      case 'MICROSOFT':
        const msTokens = await MockMicrosoftProvider.exchangeCodeForToken(
          dto.code,
          {
            clientId: provider.clientId || undefined,
            clientSecret: provider.clientSecret || undefined,
            redirectUri: provider.redirectUri || undefined,
          },
        );
        const msUser = await MockMicrosoftProvider.fetchUserInfo(
          msTokens.access_token,
        );
        claims = {
          email: msUser.email,
          name: msUser.displayName,
        };
        break;

      default:
        throw new BadRequestException('Unknown provider type');
    }

    // Validate domain restriction
    if (provider.domainRestriction) {
      const emailDomain = claims.email.split('@')[1];
      if (emailDomain !== provider.domainRestriction) {
        throw new ForbiddenException(
          `Email domain must be ${provider.domainRestriction}`,
        );
      }
    }

    // Check if user exists
    let user = await this.prisma.user.findUnique({
      where: { email: claims.email },
    });

    // Check if this is a platform admin trying to login via SSO
    if (user && PLATFORM_ADMIN_ROLES.includes(user.role)) {
      throw new ForbiddenException(
        'Platform administrators cannot use tenant SSO',
      );
    }

    if (!user) {
      // Auto-provision if enabled
      if (provider.autoProvision) {
        const name =
          claims.name ||
          `${claims.firstName || ''} ${claims.lastName || ''}`.trim() ||
          claims.email.split('@')[0];

        user = await this.prisma.user.create({
          data: {
            email: claims.email,
            password: crypto.randomBytes(32).toString('hex'), // Random unguessable password for SSO users
            name,
            tenantId,
            role: (process.env.SSO_DEFAULT_ROLE as any) || 'RECRUITER', // Configurable default role
            emailVerified: true, // SSO users are verified by IdP
          },
        });

        // Create UserTenant association
        await this.prisma.userTenant.create({
          data: {
            userId: user.id,
            tenantId,
            role: 'RECRUITER',
          },
        });

        // Audit log
        await this.prisma.auditLog.create({
          data: {
            tenantId,
            userId: user.id,
            action: 'SSO_AUTO_PROVISION',
            metadata: { email: claims.email, provider: provider.providerType },
          },
        });
      } else {
        throw new UnauthorizedException(
          'User not found and auto-provisioning is disabled',
        );
      }
    }

    // Get user's role for this tenant
    const userTenant = await this.prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId: user.id, tenantId } },
    });

    // Generate JWT tokens
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        tenantId,
        role: userTenant?.role || user.role,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: (process.env.JWT_ACCESS_EXPIRY || '1h') as any },
    );

    const refreshToken = jwt.sign(
      { sub: user.id, tenantId, type: 'refresh' },
      process.env.JWT_SECRET as string,
      { expiresIn: (process.env.JWT_REFRESH_EXPIRY || '7d') as any },
    );

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: 'SSO_LOGIN',
        metadata: { provider: provider.providerType, email: claims.email },
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: userTenant?.role || user.role,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
      },
    };
  }

  /**
   * Get available SSO providers for a tenant (public endpoint)
   */
  async getAvailableProviders(tenantId: string) {
    const providers = await this.prisma.identityProvider.findMany({
      where: { tenantId, enabled: true },
      select: {
        id: true,
        providerType: true,
        domainRestriction: true,
      },
    });

    return providers.map((p) => ({
      type: p.providerType,
      domainRestriction: p.domainRestriction,
    }));
  }
}
