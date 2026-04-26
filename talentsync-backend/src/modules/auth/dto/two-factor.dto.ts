import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, IsOptional } from 'class-validator';

/**
 * DTO for verifying 2FA token during setup
 */
export class Verify2FASetupDto {
  @ApiProperty({
    description: 'TOTP token from authenticator app',
    example: '123456',
  })
  @IsString()
  @Length(6, 6)
  token: string;
}

/**
 * DTO for verifying 2FA during login
 */
export class Verify2FALoginDto {
  @ApiProperty({
    description: 'TOTP token or recovery code',
    example: '123456',
  })
  @IsString()
  token: string;

  @ApiProperty({
    description: 'Set to true if using a recovery code',
    required: false,
    default: false,
  })
  @IsOptional()
  isRecoveryCode?: boolean;
}

/**
 * DTO for disabling 2FA
 */
export class Disable2FADto {
  @ApiProperty({
    description: 'Current password for verification',
  })
  @IsString()
  password: string;

  @ApiProperty({
    description: 'TOTP token from authenticator app',
    example: '123456',
  })
  @IsString()
  @Length(6, 6)
  token: string;
}

/**
 * Response for 2FA setup initiation
 */
export class TwoFactorSetupResponse {
  @ApiProperty({
    description: 'Secret key for manual entry in authenticator app',
    example: 'JBSWY3DPEHPK3PXP',
  })
  secret: string;

  @ApiProperty({
    description: 'Data URL of QR code image (base64)',
  })
  qrCodeUrl: string;

  @ApiProperty({
    description: 'TOTP URI for backup',
  })
  backupUri: string;
}

/**
 * Response for 2FA setup completion
 */
export class TwoFactorEnabledResponse {
  @ApiProperty({
    description: 'Recovery codes (show only once!)',
    type: [String],
    example: ['XXXX-XXXX-XX', 'YYYY-YYYY-YY'],
  })
  recoveryCodes: string[];

  @ApiProperty({
    description: 'Success message',
  })
  message: string;
}

/**
 * Response for 2FA status
 */
export class TwoFactorStatusResponse {
  @ApiProperty({
    description: 'Whether 2FA is enabled for this user',
  })
  enabled: boolean;

  @ApiProperty({
    description: 'Number of remaining unused recovery codes',
  })
  recoveryCodesRemaining: number;
}

/**
 * DTO for session listing response
 */
export class SessionDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ nullable: true })
  deviceName: string | null;

  @ApiProperty({ nullable: true })
  ipAddress: string | null;

  @ApiProperty({ nullable: true })
  lastUsedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({
    description: 'Whether this is the current session',
  })
  isCurrent: boolean;
}

/**
 * DTO for revoking a session
 */
export class RevokeSessionDto {
  @ApiProperty({
    description: 'Session ID to revoke',
  })
  @IsString()
  sessionId: string;
}
