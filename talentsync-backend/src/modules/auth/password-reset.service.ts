import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { EmailService } from '../email/email.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

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
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
    return bcrypt.hash(token, saltRounds);
  }

  /**
   * Initiate password reset - generate token and send email
   */
  async initiateReset(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Don't reveal if user exists or not
    if (!user) {
      return {
        success: true,
        message:
          'If an account with that email exists, a reset link has been sent.',
      };
    }

    // Invalidate any existing reset tokens for this user
    await this.prisma.passwordReset.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { expiresAt: new Date() },
    });

    const token = this.generateToken();
    const tokenHash = await this.hashToken(token);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    // Send reset email
    try {
      await this.emailService.sendMail(null, {
        to: email,
        template: 'password-reset',
        context: {
          userName: user.name || 'there',
          resetUrl,
        },
      });
    } catch (error) {
      this.logger.error('Failed to send password reset email:', error);
      // Don't fail if email fails - still return success to not reveal user existence
    }

    return {
      success: true,
      message:
        'If an account with that email exists, a reset link has been sent.',
    };
  }

  /**
   * Validate reset token without using it
   */
  async validateToken(
    token: string,
  ): Promise<{ valid: boolean; email?: string }> {
    const resets = await this.prisma.passwordReset.findMany({
      where: {
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: { select: { email: true } },
      },
    });

    for (const reset of resets) {
      const isMatch = await bcrypt.compare(token, reset.tokenHash);
      if (isMatch) {
        return { valid: true, email: reset.user.email };
      }
    }

    return { valid: false };
  }

  /**
   * Execute password reset
   */
  async executeReset(token: string, newPassword: string) {
    const resets = await this.prisma.passwordReset.findMany({
      where: {
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: true,
      },
    });

    let matchedReset = null;
    for (const reset of resets) {
      const isMatch = await bcrypt.compare(token, reset.tokenHash);
      if (isMatch) {
        matchedReset = reset;
        break;
      }
    }

    if (!matchedReset) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password and mark reset as used in transaction
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: matchedReset.userId },
        data: { password: hashedPassword },
      }),
      this.prisma.passwordReset.update({
        where: { id: matchedReset.id },
        data: { usedAt: new Date() },
      }),
      // Revoke all refresh tokens for security
      this.prisma.refreshToken.updateMany({
        where: { userId: matchedReset.userId },
        data: { revoked: true },
      }),
    ]);

    // Log the password change
    await this.prisma.auditLog.create({
      data: {
        userId: matchedReset.userId,
        action: 'password.reset',
        metadata: { method: 'email_token' },
      },
    });

    return {
      success: true,
      message:
        'Password has been reset successfully. Please log in with your new password.',
    };
  }

  /**
   * Email template for password reset
   */
  private getResetEmailTemplate(userName: string, resetUrl: string): string {
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
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="color: #1f2937;">Reset Your Password</h1>
        </div>
        <div class="content">
            <p>Hi ${userName},</p>
            <p>We received a request to reset your TalentSync password. Click the button below to create a new password:</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <div class="warning">
                <strong>⏰ This link will expire in 1 hour.</strong>
            </div>
            <p style="color: #6b7280; font-size: 14px;">If you didn't request a password reset, please ignore this email or contact support if you're concerned about your account security.</p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} TalentSync. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `.trim();
  }
}
