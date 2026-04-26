import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { InvitationService } from './invitation.service';
import { PasswordResetService } from './password-reset.service';
import { EmailService } from '../email/email.service';
import { BusinessException } from '../../common/exceptions';
import * as bcrypt from 'bcrypt';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from './utils/token.util';
import {
  generateVerificationToken,
  generateTokenExpiry,
  isTokenExpired,
} from './utils/verification.util';
import { SignupDto } from './dto/signup.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import ms from 'ms';
import { Request } from 'express';
import { BruteForceService } from '../../common/brute-force.guard';
import { PasswordPolicyService } from '../../common/password-policy.service';

export interface TokenPayload {
  sub: string;
  email: string;
  activeTenantId: string | null;
  roles: Record<string, string>; // { tenantId: role }
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    emailVerified: boolean;
  };
  activeTenantId: string | null;
  tenants: Array<{
    id: string;
    name: string;
    role: string;
    brandingLogoUrl?: string | null;
  }>;
}

@Injectable()
export class AuthService {
  // Trial period configuration - can be overridden via environment variable
  private readonly TRIAL_DURATION_DAYS =
    Number(process.env.TRIAL_DURATION_DAYS) || 14;

  constructor(
    private prisma: PrismaService,
    private invitationService: InvitationService,
    private passwordResetService: PasswordResetService,
    private emailService: EmailService,
    private bruteForceService: BruteForceService,
    private passwordPolicyService: PasswordPolicyService,
  ) {}

  /**
   * Signup: Creates a new tenant and admin user in a single transaction
   * This is the "Trial Signup" flow
   */
  async signUpCreateTenant(
    dto: SignupDto,
    req?: Request,
  ): Promise<AuthResponse> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existingUser) {
      throw new BadRequestException(
        'An account with this email already exists',
      );
    }

    // Validate password strength (default policy for new signups)
    this.passwordPolicyService.enforcePolicy(dto.password);

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    // Create tenant, user, and userTenant in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create the tenant
      const tenant = await tx.tenant.create({
        data: {
          name: dto.companyName,
          domain: dto.domain || null,
          trialActive: true,
          trialEndsAt: new Date(
            Date.now() + this.TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000,
          ),
        },
      });

      // Create the admin user
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          password: hashedPassword,
          name: dto.name,
          role: 'ADMIN',
          status: 'ACTIVE',
          tenantId: tenant.id, // Legacy field for backward compatibility
          lastLogin: new Date(),
        },
      });

      // Create UserTenant association as ADMIN
      await tx.userTenant.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          action: 'tenant.created',
          metadata: { tenantName: tenant.name, signupEmail: user.email },
          ip: req?.ip,
        },
      });

      return { user, tenant };
    });

    // Generate tokens with the new tenant as active
    const tokens = await this.generateTokensForUser(
      result.user.id,
      result.tenant.id,
      req,
    );

    return {
      ...tokens,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        emailVerified: result.user.emailVerified,
      },
      activeTenantId: result.tenant.id,
      tenants: [
        {
          id: result.tenant.id,
          name: result.tenant.name,
          role: 'ADMIN',
          brandingLogoUrl: result.tenant.brandingLogoUrl,
        },
      ],
    };
  }

  /**
   * Legacy register - kept for backward compatibility
   * Note: Can ONLY create new tenants (trial signup), NOT join existing tenants
   * To join an existing tenant, users MUST use the invitation flow
   */
  async register(dto: {
    email: string;
    password: string;
    name?: string;
    tenantId?: string;
  }) {
    // SECURITY: Reject any attempt to directly join a tenant
    // Users MUST use the invitation flow (/auth/accept-invite) to join existing tenants
    if (dto.tenantId) {
      throw new BadRequestException(
        'Direct tenant registration is not allowed. Please use an invitation link to join an existing organization.',
      );
    }

    // No tenantId - treat as trial signup with placeholder company name
    return this.signUpCreateTenant({
      email: dto.email,
      password: dto.password,
      name: dto.name || 'Admin',
      companyName: `${dto.email.split('@')[0]}'s Company`,
    });
  }

  /**
   * Validate user credentials
   */
  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        userTenants: {
          where: { status: 'ACTIVE' },
          include: {
            tenant: {
              select: { id: true, name: true, brandingLogoUrl: true },
            },
          },
        },
      },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new UnauthorizedException('Invalid credentials');

    if (user.status === 'INACTIVE') {
      throw new UnauthorizedException('Account is deactivated');
    }

    return user;
  }

  /**
   * Login: Authenticate user and return tokens with tenant info
   */
  async login(
    email: string,
    password: string,
    req?: Request,
  ): Promise<AuthResponse> {
    const ip = req?.ip || 'unknown';
    const formattedEmail = email.toLowerCase();

    // 1. Check if blocked
    const { locked, ttl } = await this.bruteForceService.isLocked(
      ip,
      formattedEmail,
    );
    if (locked) {
      throw new ForbiddenException(
        `Account locked due to too many failed attempts. Try again in ${Math.ceil(ttl / 60)} minutes.`,
      );
    }

    try {
      const user = await this.validateUser(email, password);

      // 2. Clear failures on success
      await this.bruteForceService.clearFailedAttempts(ip, formattedEmail);

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      // Determine active tenant
      let activeTenantId: string | null = null;
      const tenants = user.userTenants.map((ut) => ({
        id: ut.tenant.id,
        name: ut.tenant.name,
        role: ut.role,
        brandingLogoUrl: ut.tenant.brandingLogoUrl,
      }));

      if (tenants.length === 1) {
        activeTenantId = tenants[0].id;
      } else if (tenants.length > 1) {
        // In production, you might want to use last-used tenant from user preferences
        activeTenantId = tenants[0].id;
      }

      // Generate tokens
      const tokens = await this.generateTokensForUser(
        user.id,
        activeTenantId,
        req,
      );

      // Create audit log
      if (activeTenantId) {
        await this.prisma.auditLog.create({
          data: {
            tenantId: activeTenantId,
            userId: user.id,
            action: 'user.login',
            ip: req?.ip,
          },
        });
      }

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
        },
        activeTenantId,
        tenants,
      };
    } catch (error) {
      // 3. Record failure
      if (error instanceof UnauthorizedException) {
        const { locked: nowLocked, attempts } =
          await this.bruteForceService.recordFailedAttempt(ip, formattedEmail);
        if (nowLocked) {
          throw new ForbiddenException(
            'Account locked due to too many failed attempts. Please wait 15 minutes.',
          );
        }
      }
      throw error;
    }
  }

  /**
   * Switch active tenant
   */
  async switchTenant(
    userId: string,
    tenantId: string,
    req?: Request,
  ): Promise<AuthResponse> {
    // Verify user has access to this tenant
    const userTenant = await this.prisma.userTenant.findUnique({
      where: {
        userId_tenantId: { userId, tenantId },
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            brandingLogoUrl: true,
            brandingColors: true,
          },
        },
        user: {
          include: {
            userTenants: {
              where: { status: 'ACTIVE' },
              include: {
                tenant: {
                  select: { id: true, name: true, brandingLogoUrl: true },
                },
              },
            },
          },
        },
      },
    });

    if (!userTenant || userTenant.status !== 'ACTIVE') {
      throw new ForbiddenException('You do not have access to this tenant');
    }

    // Revoke old refresh tokens (optional: for security)
    // Keeping current token valid but issuing new ones with updated activeTenantId

    // Generate new tokens with updated activeTenantId
    const tokens = await this.generateTokensForUser(userId, tenantId, req);

    const tenants = userTenant.user.userTenants.map((ut) => ({
      id: ut.tenant.id,
      name: ut.tenant.name,
      role: ut.role,
      brandingLogoUrl: ut.tenant.brandingLogoUrl,
    }));

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'tenant.switched',
        metadata: { newTenantId: tenantId },
        ip: req?.ip,
      },
    });

    return {
      ...tokens,
      user: {
        id: userTenant.user.id,
        email: userTenant.user.email,
        name: userTenant.user.name,
        emailVerified: userTenant.user.emailVerified,
      },
      activeTenantId: tenantId,
      tenants,
    };
  }

  /**
   * Accept invitation and create/link user
   */
  async acceptInvite(
    dto: AcceptInviteDto,
    req?: Request,
  ): Promise<AuthResponse> {
    // Verify and get invitation details
    const invite = await this.invitationService.getInviteByToken(dto.token);
    const inviteId = await this.invitationService.verifyToken(dto.token);

    // Check if user with this email already exists
    let user = await this.prisma.user.findUnique({
      where: { email: invite.email.toLowerCase() },
    });

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    if (user) {
      // Existing user - link to new tenant
      // Check if already in this tenant
      const existingUserTenant = await this.prisma.userTenant.findUnique({
        where: {
          userId_tenantId: { userId: user.id, tenantId: invite.tenant.id },
        },
      });

      if (existingUserTenant) {
        throw new BadRequestException(
          'You are already a member of this tenant',
        );
      }

      // DON'T overwrite existing user's password when they join a new tenant
      // They keep their existing password, only update name if provided
      if (dto.name) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            name: dto.name,
            status: 'ACTIVE',
          },
        });
      }
    } else {
      // New user - create account
      user = await this.prisma.user.create({
        data: {
          email: invite.email.toLowerCase(),
          password: hashedPassword,
          name: dto.name || null,
          role: invite.role,
          status: 'ACTIVE',
          tenantId: invite.tenant.id, // Legacy field
        },
      });
    }

    // Create UserTenant association
    await this.prisma.userTenant.create({
      data: {
        userId: user.id,
        tenantId: invite.tenant.id,
        role: invite.role,
        status: 'ACTIVE',
        invitedBy: invite.id,
        invitedAt: new Date(),
      },
    });

    // Mark invitation as used
    await this.invitationService.markInviteUsed(inviteId);

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId: invite.tenant.id,
        userId: user.id,
        action: 'user.invitation_accepted',
        metadata: { invitationId: invite.id, role: invite.role },
        ip: req?.ip,
      },
    });

    // Generate tokens and return
    const tokens = await this.generateTokensForUser(
      user.id,
      invite.tenant.id,
      req,
    );

    // Get all user tenants for response
    const userTenants = await this.prisma.userTenant.findMany({
      where: { userId: user.id, status: 'ACTIVE' },
      include: {
        tenant: { select: { id: true, name: true, brandingLogoUrl: true } },
      },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
      },
      activeTenantId: invite.tenant.id,
      tenants: userTenants.map((ut) => ({
        id: ut.tenant.id,
        name: ut.tenant.name,
        role: ut.role,
        brandingLogoUrl: ut.tenant.brandingLogoUrl,
      })),
    };
  }

  /**
   * Refresh tokens
   */
  async refresh(refreshToken: string, req?: Request) {
    try {
      const decoded: any = verifyRefreshToken(refreshToken);
      const userId = decoded.sub;

      const record = await this.prisma.refreshToken.findFirst({
        where: { userId, revoked: false },
        orderBy: { createdAt: 'desc' },
      });

      if (!record) throw new UnauthorizedException('Refresh token not found');

      const valid = await bcrypt.compare(refreshToken, record.tokenHash);
      if (!valid) {
        // Possible token theft - revoke all tokens
        await this.prisma.refreshToken.updateMany({
          where: { userId },
          data: { revoked: true },
        });
        throw new UnauthorizedException(
          'Invalid refresh token - all sessions revoked',
        );
      }

      // Check expiration
      if (new Date() > record.expiresAt) {
        throw new UnauthorizedException('Refresh token expired');
      }

      // Rotate - revoke old token
      await this.prisma.refreshToken.update({
        where: { id: record.id },
        data: { revoked: true },
      });

      // Get user with tenant info
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          userTenants: {
            where: { status: 'ACTIVE' },
            include: {
              tenant: {
                select: { id: true, name: true, brandingLogoUrl: true },
              },
            },
          },
        },
      });

      if (!user) throw new UnauthorizedException('User not found');

      // Use the same activeTenantId from the old token, or determine a new one
      let activeTenantId = record.activeTenantId;
      if (!activeTenantId && user.userTenants.length > 0) {
        activeTenantId = user.userTenants[0].tenantId;
      }

      // Generate new tokens
      const tokens = await this.generateTokensForUser(
        userId,
        activeTenantId,
        req,
      );

      const tenants = user.userTenants.map((ut) => ({
        id: ut.tenant.id,
        name: ut.tenant.name,
        role: ut.role,
        brandingLogoUrl: ut.tenant.brandingLogoUrl,
      }));

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
        },
        activeTenantId,
        tenants,
      };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Logout - revoke all refresh tokens for user
   */
  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true },
    });
    return { success: true };
  }

  /**
   * Cleanup old revoked/expired refresh tokens to prevent unbounded table growth
   * This should be called by a scheduled job (e.g., daily via cron)
   * @param olderThanDays - Delete tokens older than this many days (default: 30)
   * @returns Number of deleted tokens
   */
  async cleanupOldTokens(
    olderThanDays: number = 30,
  ): Promise<{ deleted: number }> {
    const cutoffDate = new Date(
      Date.now() - olderThanDays * 24 * 60 * 60 * 1000,
    );

    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          // Revoked tokens older than cutoff
          { revoked: true, createdAt: { lt: cutoffDate } },
          // Expired tokens older than cutoff
          { expiresAt: { lt: cutoffDate } },
        ],
      },
    });

    return { deleted: result.count };
  }

  /**
   * Password reset - initiate
   */
  async forgotPassword(email: string) {
    return this.passwordResetService.initiateReset(email);
  }

  /**
   * Password reset - validate token
   */
  async validateResetToken(token: string) {
    return this.passwordResetService.validateToken(token);
  }

  /**
   * Password reset - execute
   */
  async resetPassword(token: string, newPassword: string) {
    return this.passwordResetService.executeReset(token, newPassword);
  }

  /**
   * Generate access and refresh tokens for a user
   */
  private async generateTokensForUser(
    userId: string,
    activeTenantId: string | null,
    req?: Request,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Get user and their roles in all tenants
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userTenants: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    if (!user) throw new UnauthorizedException('User not found');

    // Build roles map: { tenantId: role }
    const roles: Record<string, string> = {};
    for (const ut of user.userTenants) {
      roles[ut.tenantId] = ut.role;
    }

    const payload: TokenPayload = {
      sub: userId,
      email: user.email,
      activeTenantId,
      roles,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Store hashed refresh token
    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    const ttl = process.env.REFRESH_TOKEN_TTL || '14d';

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashedRefresh,
        activeTenantId,
        revoked: false,
        expiresAt: new Date(Date.now() + (ms(ttl as any) as unknown as number)),
        userAgent: req?.headers?.['user-agent']?.substring(0, 255),
        ipAddress: req?.ip,
      },
    });

    return { accessToken, refreshToken };
  }

  // ============================================
  // Email Verification Methods (kept from original)
  // ============================================

  async sendVerificationEmail(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (user.emailVerified)
      throw new BusinessException('Email already verified');

    const token = generateVerificationToken();
    const expiry = generateTokenExpiry();

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        verificationToken: token,
        verificationExpiry: expiry,
      },
    });

    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

    // Send verification email via EmailService
    try {
      await this.emailService.sendMail(null, {
        to: user.email,
        template: 'verification',
        context: {
          name: user.name || 'User',
          verificationUrl,
          expiryHours: 24,
        },
      });
    } catch (error) {
      console.error('Failed to send verification email:', error);
      // Log but don't fail - email might not be configured
    }

    return { success: true, message: 'Verification email sent' };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    if (user.emailVerified) {
      throw new BusinessException('Email already verified');
    }

    if (isTokenExpired(user.verificationExpiry)) {
      throw new BusinessException('Verification token has expired');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationExpiry: null,
      },
    });

    return { success: true, message: 'Email verified successfully' };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) throw new BadRequestException('User not found');
    if (user.emailVerified)
      throw new BusinessException('Email already verified');

    return this.sendVerificationEmail(user.id);
  }

  // ============================================
  // Invitation Methods (delegate to InvitationService)
  // ============================================

  async createInvitation(
    tenantId: string,
    email: string,
    role: any,
    createdBy?: string,
  ) {
    return this.invitationService.createInvite(
      tenantId,
      email,
      role,
      createdBy,
    );
  }

  async getInvitePreview(token: string) {
    return this.invitationService.getInviteByToken(token);
  }

  async listPendingInvitations(tenantId: string) {
    return this.invitationService.listPendingInvites(tenantId);
  }

  async cancelInvitation(tenantId: string, inviteId: string) {
    return this.invitationService.cancelInvite(tenantId, inviteId);
  }

  /**
   * Check password strength against policy
   */
  async checkPassword(password: string) {
    return this.passwordPolicyService.validatePassword(password);
  }
}
