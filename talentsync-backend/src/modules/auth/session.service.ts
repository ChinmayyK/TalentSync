import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface Session {
  id: string;
  deviceName: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  isCurrent: boolean;
}

export type RevokeReason =
  | 'logout'
  | 'password_change'
  | 'role_change'
  | 'admin_revoke'
  | 'user_deactivated'
  | 'security_concern';

/**
 * Session Management Service
 * Handles session listing, token revocation, and invalidation
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * List all active sessions for a user
   */
  async listSessions(
    userId: string,
    currentTokenId?: string,
  ): Promise<Session[]> {
    const sessions = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        deviceName: true,
        userAgent: true,
        ipAddress: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    return sessions.map((session) => ({
      ...session,
      isCurrent: session.id === currentTokenId,
    }));
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(
    userId: string,
    sessionId: string,
    reason: RevokeReason = 'admin_revoke',
    actorId?: string,
  ): Promise<boolean> {
    const result = await this.prisma.refreshToken.updateMany({
      where: {
        id: sessionId,
        userId,
        revoked: false,
      },
      data: {
        revoked: true,
        revokedReason: reason,
      },
    });

    if (result.count > 0) {
      this.logger.log(
        `Revoked session ${sessionId} for user ${userId}, reason: ${reason}`,
      );
    }

    return result.count > 0;
  }

  /**
   * Revoke all sessions for a user except the current one
   */
  async revokeOtherSessions(
    userId: string,
    currentSessionId: string,
    reason: RevokeReason = 'logout',
  ): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revoked: false,
        id: { not: currentSessionId },
      },
      data: {
        revoked: true,
        revokedReason: reason,
      },
    });

    this.logger.log(
      `Revoked ${result.count} sessions for user ${userId}, reason: ${reason}`,
    );
    return result.count;
  }

  /**
   * Revoke all sessions for a user (used for password change, deactivation, etc.)
   */
  async revokeAllSessions(
    userId: string,
    reason: RevokeReason,
    tenantId?: string,
  ): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revoked: false,
      },
      data: {
        revoked: true,
        revokedReason: reason,
      },
    });

    // Audit log
    if (tenantId) {
      await this.auditService.log({
        tenantId,
        userId,
        action: `auth.sessions.revoked`,
        metadata: { reason, count: result.count },
      });
    }

    this.logger.log(
      `Revoked all ${result.count} sessions for user ${userId}, reason: ${reason}`,
    );
    return result.count;
  }

  /**
   * Update last used timestamp for a session (called on token refresh)
   */
  async touchSession(sessionId: string): Promise<void> {
    await this.prisma.refreshToken
      .update({
        where: { id: sessionId },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {
        // Session might not exist or be revoked - that's okay
      });
  }

  /**
   * Get session count for a user
   */
  async getSessionCount(userId: string): Promise<number> {
    return this.prisma.refreshToken.count({
      where: {
        userId,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
    });
  }

  /**
   * Check if session limit is exceeded for tenant
   */
  async checkSessionLimit(
    userId: string,
    tenantId: string,
  ): Promise<{
    allowed: boolean;
    currentCount: number;
    limit: number | null;
  }> {
    const policy = await this.prisma.tenantSecurityPolicy.findUnique({
      where: { tenantId },
      select: { maxConcurrentSessions: true },
    });

    const limit = policy?.maxConcurrentSessions ?? null;
    const currentCount = await this.getSessionCount(userId);

    return {
      allowed: limit === null || currentCount < limit,
      currentCount,
      limit,
    };
  }

  /**
   * Parse user agent to get device name
   */
  parseDeviceName(userAgent: string | undefined): string | null {
    if (!userAgent) return null;

    // Simple parsing - can be enhanced with ua-parser-js
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android Device';
    if (userAgent.includes('Mac OS')) return 'Mac';
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Linux')) return 'Linux';

    return 'Unknown Device';
  }
}
