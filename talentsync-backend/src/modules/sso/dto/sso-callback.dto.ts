import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SSOProviderType {
  SAML = 'SAML',
  GOOGLE = 'GOOGLE',
  MICROSOFT = 'MICROSOFT',
}

export class SSOCallbackDto {
  @ApiProperty({ description: 'Authorization code or SAML response' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'State parameter for CSRF validation' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ enum: SSOProviderType, description: 'Provider type' })
  @IsOptional()
  @IsEnum(SSOProviderType)
  provider?: SSOProviderType;

  // For SAML responses
  @ApiPropertyOptional({ description: 'SAML Response (base64)' })
  @IsOptional()
  @IsString()
  SAMLResponse?: string;

  @ApiPropertyOptional({ description: 'Relay state for SAML' })
  @IsOptional()
  @IsString()
  RelayState?: string;
}
