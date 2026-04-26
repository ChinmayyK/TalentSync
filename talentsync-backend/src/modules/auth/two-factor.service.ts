import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';

export interface TwoFactorSetupResult {
  secret: string;
  qrCodeUrl: string;
  backupUri: string;
}

export interface RecoveryCodesResult {
  codes: string[];
}

/**
 * Two-Factor Authentication Service
 * Implements TOTP-based 2FA (RFC 6238)
 */
@Injectable()
export class TwoFactorService {
  private readonly APP_NAME = 'TalentSync';
  private readonly RECOVERY_CODE_COUNT = 8;
  private readonly RECOVERY_CODE_LENGTH = 10;

  constructor(private prisma: PrismaService) {
    // Configure authenticator
    authenticator.options = {
      digits: 6,
      step: 30, // 30-second window
      window: 1, // Allow 1 step before/after for clock drift
    };
  }

  /**
   * Initialize 2FA setup - generates secret and QR code
   * Does NOT enable 2FA yet - user must verify first
   */
  async initSetup(userId: string): Promise<TwoFactorSetupResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, twoFactorEnabled: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException(
        '2FA is already enabled. Disable it first to set up again.',
      );
    }

    // Generate a new secret
    const secret = authenticator.generateSecret();

    // Generate TOTP URI for QR code
    const otpUri = authenticator.keyuri(user.email, this.APP_NAME, secret);

    // Generate QR code as data URL
    const qrCodeUrl = await QRCode.toDataURL(otpUri);

    // Store secret temporarily (encrypted) - not enabled yet
    const encryptedSecret = this.encryptSecret(secret);
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: encryptedSecret },
    });

    return {
      secret, // For manual entry
      qrCodeUrl, // For QR code scanning
      backupUri: otpUri, // URI for backup
    };
  }

  /**
   * Verify TOTP token and enable 2FA
   * Called after user scans QR code and enters the token
   */
  async verifyAndEnable(
    userId: string,
    token: string,
  ): Promise<RecoveryCodesResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException(
        '2FA setup not initiated. Call /2fa/enable first.',
      );
    }

    // Decrypt and verify token
    const secret = this.decryptSecret(user.twoFactorSecret);
    const isValid = authenticator.verify({ token, secret });

    if (!isValid) {
      throw new BadRequestException(
        'Invalid verification code. Please try again.',
      );
    }

    // Generate recovery codes
    const { codes, hashedCodes } = this.generateRecoveryCodes();

    // Enable 2FA
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        recoveryCodes: hashedCodes,
      },
    });

    return { codes };
  }

  /**
   * Verify TOTP token during login
   */
  async verifyToken(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      throw new UnauthorizedException('2FA not enabled for this user');
    }

    const secret = this.decryptSecret(user.twoFactorSecret);
    return authenticator.verify({ token, secret });
  }

  // Rate limiting for recovery code attempts
  private recoveryCodeAttempts = new Map<
    string,
    { count: number; resetAt: number }
  >();
  private readonly MAX_RECOVERY_ATTEMPTS = 5;
  private readonly RECOVERY_WINDOW_MS = 60 * 60 * 1000; // 1 hour

  /**
   * Verify and consume a recovery code
   * Rate limited to prevent brute force attacks
   */
  async verifyRecoveryCode(userId: string, code: string): Promise<boolean> {
    // Check rate limit
    const now = Date.now();
    const key = `recovery:${userId}`;
    const limit = this.recoveryCodeAttempts.get(key);

    if (limit && now < limit.resetAt) {
      if (limit.count >= this.MAX_RECOVERY_ATTEMPTS) {
        throw new UnauthorizedException(
          'Too many recovery code attempts. Please try again later.',
        );
      }
      limit.count++;
    } else {
      this.recoveryCodeAttempts.set(key, {
        count: 1,
        resetAt: now + this.RECOVERY_WINDOW_MS,
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { recoveryCodes: true, twoFactorEnabled: true },
    });

    if (!user?.twoFactorEnabled) {
      throw new UnauthorizedException('2FA not enabled for this user');
    }

    const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Find matching recovery code
    for (let i = 0; i < user.recoveryCodes.length; i++) {
      const match = await bcrypt.compare(normalizedCode, user.recoveryCodes[i]);
      if (match) {
        // Remove the used code
        const updatedCodes = [...user.recoveryCodes];
        updatedCodes.splice(i, 1);

        await this.prisma.user.update({
          where: { id: userId },
          data: { recoveryCodes: updatedCodes },
        });

        // Clear rate limit on success
        this.recoveryCodeAttempts.delete(key);
        return true;
      }
    }

    return false;
  }

  /**
   * Disable 2FA for a user (requires password verification done upstream)
   */
  async disable(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        recoveryCodes: [],
      },
    });
  }

  /**
   * Generate new recovery codes (regenerate)
   */
  async regenerateRecoveryCodes(userId: string): Promise<RecoveryCodesResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });

    if (!user?.twoFactorEnabled) {
      throw new BadRequestException(
        '2FA must be enabled to regenerate recovery codes',
      );
    }

    const { codes, hashedCodes } = this.generateRecoveryCodes();

    await this.prisma.user.update({
      where: { id: userId },
      data: { recoveryCodes: hashedCodes },
    });

    return { codes };
  }

  /**
   * Check if user requires 2FA based on tenant policy
   */
  async requires2FA(userId: string, tenantId: string): Promise<boolean> {
    const [user, policy] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { twoFactorEnabled: true },
      }),
      this.prisma.tenantSecurityPolicy.findUnique({
        where: { tenantId },
      }),
    ]);

    // If user has 2FA enabled, always require it
    if (user?.twoFactorEnabled) {
      return true;
    }

    // Check tenant policy
    if (policy?.enforce2FA) {
      return true;
    }

    // Check admin-specific enforcement
    if (policy?.enforce2FAForAdmins) {
      const userTenant = await this.prisma.userTenant.findUnique({
        where: { userId_tenantId: { userId, tenantId } },
        select: { role: true },
      });

      if (userTenant?.role === 'ADMIN') {
        return true;
      }
    }

    return false;
  }

  /**
   * Get 2FA status for user
   */
  async getStatus(userId: string): Promise<{
    enabled: boolean;
    recoveryCodesRemaining: number;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true, recoveryCodes: true },
    });

    return {
      enabled: user?.twoFactorEnabled || false,
      recoveryCodesRemaining: user?.recoveryCodes?.length || 0,
    };
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Generate recovery codes
   */
  private generateRecoveryCodes(): { codes: string[]; hashedCodes: string[] } {
    const codes: string[] = [];
    const hashedCodes: string[] = [];

    for (let i = 0; i < this.RECOVERY_CODE_COUNT; i++) {
      // Generate code like: XXXX-XXXX-XX (uppercase alphanumeric)
      const code = this.generateRandomCode();
      codes.push(code);
      // Hash for storage - use sync for simplicity since it's in a loop
      hashedCodes.push(bcrypt.hashSync(code.replace(/-/g, ''), 10));
    }

    return { codes, hashedCodes };
  }

  /**
   * Generate a random recovery code
   */
  private generateRandomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No O, 0, I, 1
    let code = '';

    for (let i = 0; i < this.RECOVERY_CODE_LENGTH; i++) {
      const randomIndex = crypto.randomInt(0, chars.length);
      code += chars[randomIndex];
      if (i === 3 || i === 7) code += '-'; // Format: XXXX-XXXX-XX
    }

    return code;
  }

  /**
   * Encrypt 2FA secret for storage
   */
  private encryptSecret(secret: string): string {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt 2FA secret from storage
   */
  private decryptSecret(encryptedData: string): string {
    const key = this.getEncryptionKey();
    const parts = encryptedData.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Get encryption key from environment
   */
  private getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
    if (!key) {
      throw new Error('ENCRYPTION_KEY or JWT_SECRET must be set');
    }

    // Derive a 32-byte key from the secret using configurable salt
    const salt = process.env.ENCRYPTION_SALT || 'talentsync-2fa-salt';
    return crypto.scryptSync(key, salt, 32);
  }
}
