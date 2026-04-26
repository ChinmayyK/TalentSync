import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SSOProviderType {
  SAML = 'SAML',
  GOOGLE = 'GOOGLE',
  MICROSOFT = 'MICROSOFT',
}

export class InitiateSSODto {
  @ApiPropertyOptional({
    enum: SSOProviderType,
    description: 'Specific provider to use (optional)',
  })
  @IsOptional()
  @IsEnum(SSOProviderType)
  provider?: SSOProviderType;

  @ApiPropertyOptional({ description: 'Return URL after SSO completion' })
  @IsOptional()
  @IsString()
  returnUrl?: string;
}
