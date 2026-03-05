import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SSOProviderType {
  SAML = 'SAML',
  GOOGLE = 'GOOGLE',
  MICROSOFT = 'MICROSOFT',
}

export class CreateIdentityProviderDto {
  @ApiProperty({ enum: SSOProviderType, description: 'SSO provider type' })
  @IsEnum(SSOProviderType)
  providerType: SSOProviderType;

  // OAuth credentials
  @ApiPropertyOptional({ description: 'OAuth Client ID' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: 'OAuth Client Secret' })
  @IsOptional()
  @IsString()
  clientSecret?: string;

  @ApiPropertyOptional({ description: 'OAuth Redirect URI' })
  @IsOptional()
  @IsString()
  redirectUri?: string;

  // Domain restriction
  @ApiPropertyOptional({ description: 'Domain restriction (e.g., acme.com)' })
  @IsOptional()
  @IsString()
  domainRestriction?: string;

  // SAML config
  @ApiPropertyOptional({ description: 'SAML Metadata URL' })
  @IsOptional()
  @IsString()
  samlMetadataUrl?: string;

  @ApiPropertyOptional({ description: 'SAML Entity ID' })
  @IsOptional()
  @IsString()
  samlEntityId?: string;

  @ApiPropertyOptional({ description: 'SAML Certificate (PEM format)' })
  @IsOptional()
  @IsString()
  samlCertificate?: string;

  @ApiPropertyOptional({ description: 'SAML Assertion Consumer Service URL' })
  @IsOptional()
  @IsString()
  samlAcsUrl?: string;

  @ApiPropertyOptional({ description: 'SAML Single Sign-On URL' })
  @IsOptional()
  @IsString()
  samlSsoUrl?: string;

  @ApiPropertyOptional({ description: 'SAML Single Logout URL' })
  @IsOptional()
  @IsString()
  samlLogoutUrl?: string;

  // Behavior
  @ApiPropertyOptional({
    description: 'Auto-provision users on first login',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  autoProvision?: boolean;

  @ApiPropertyOptional({ description: 'Enable this provider', default: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

