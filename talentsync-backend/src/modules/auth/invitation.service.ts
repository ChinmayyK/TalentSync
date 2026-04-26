import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { EmailService } from '../email/email.service';
import { Role, Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class InvitationService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Generate a secure random token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash token for storage
   */
  private async hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, 10);
  }

  /**
   * Create a new invitation
   */
  async createInvite(
    tenantId: string,
    email: string,
    role: Role = 'RECRUITER',
    createdBy?: string,
    expiresInDays: number = 7,
  ) {
    // Check if invitation already exists for this email in this tenant
    const existingInvite = await this.prisma.invitation.findFirst({
      where: {
        tenantId,
        email: email.toLowerCase(),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvite) {
      throw new BadRequestException(
        'An active invitation already exists for this email',
      );
    }

    // Check if user already exists in this tenant
    const existingUserTenant = await this.prisma.userTenant.findFirst({
      where: {
        tenantId,
        user: { email: email.toLowerCase() },
      },
    });

    if (existingUserTenant) {
      throw new BadRequestException('User is already a member of this tenant');
    }

    const token = this.generateToken();
    const tokenHash = await this.hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const invitation = await this.prisma.invitation.create({
      data: {
        tenantId,
        email: email.toLowerCase(),
        role,
        tokenHash,
        expiresAt,
        createdBy,
      },
      include: {
        tenant: {
          select: { name: true, brandingLogoUrl: true },
        },
      },
    });

    // Get frontend URL for invite link
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteUrl = `${frontendUrl}/invite?token=${token}`;

    // Send invitation email
    try {
      // Use template-based email sending
      await this.emailService.sendMail(tenantId, {
        to: email,
        template: 'invitation',
        context: {
          tenantName: invitation.tenant.name,
          inviteUrl,
          expiresInDays,
        },
      });
    } catch (error) {
      console.error('Failed to send invitation email:', error);
      // Don't fail the invitation creation if email fails
    }

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      inviteUrl, // Only return in dev mode
    };
  }

  /**
   * Get invitation by token (for preview before accepting)
   */
  async getInviteByToken(token: string) {
    const invitations = await this.prisma.invitation.findMany({
      where: {
        usedAt: null,
        expiresAt: { gt: new Date() },
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
      },
    });

    // Find matching invitation by comparing hashed tokens
    for (const invitation of invitations) {
      const isMatch = await bcrypt.compare(token, invitation.tokenHash);
      if (isMatch) {
        return {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
          tenant: invitation.tenant,
        };
      }
    }

    throw new BadRequestException('Invalid or expired invitation token');
  }

  /**
   * Verify token and return invitation ID
   */
  async verifyToken(token: string): Promise<string> {
    const invitations = await this.prisma.invitation.findMany({
      where: {
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    for (const invitation of invitations) {
      const isMatch = await bcrypt.compare(token, invitation.tokenHash);
      if (isMatch) {
        return invitation.id;
      }
    }

    throw new BadRequestException('Invalid or expired invitation token');
  }

  /**
   * Mark invitation as used
   */
  async markInviteUsed(inviteId: string) {
    return this.prisma.invitation.update({
      where: { id: inviteId },
      data: { usedAt: new Date() },
    });
  }

  /**
   * List pending invitations for a tenant
   */
  async listPendingInvites(tenantId: string) {
    return this.prisma.invitation.findMany({
      where: {
        tenantId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cancel/revoke an invitation
   */
  async cancelInvite(tenantId: string, inviteId: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: inviteId, tenantId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.usedAt) {
      throw new BadRequestException('This invitation has already been used');
    }

    // Set expiry to now to invalidate it
    return this.prisma.invitation.update({
      where: { id: inviteId },
      data: { expiresAt: new Date() },
    });
  }

  /**
   * Email template for invitations
   */
  private getInviteEmailTemplate(
    tenantName: string,
    inviteUrl: string,
    expiresInDays: number,
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; }
        .content { background: #f9fafb; border-radius: 8px; padding: 30px; margin: 20px 0; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; }
        .footer { text-align: center; color: #6b7280; font-size: 14px; padding: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="color: #1f2937;">You're invited to TalentSync!</h1>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p><strong>${tenantName}</strong> has invited you to join their team on TalentSync, the smart interview management platform.</p>
            <p>Click the button below to accept your invitation and create your account:</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" class="button">Accept Invitation</a>
            </p>
            <p style="color: #6b7280; font-size: 14px;">This invitation will expire in ${expiresInDays} days.</p>
        </div>
        <div class="footer">
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
            <p>© ${new Date().getFullYear()} TalentSync. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `.trim();
  }
}
