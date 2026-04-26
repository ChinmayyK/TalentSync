import { IsOptional, IsString } from 'class-validator';

export class UpdateSsoDto {
  @IsOptional() @IsString() provider?: 'saml' | 'oauth' | null;
  @IsOptional() @IsString() samlEntityId?: string;
  @IsOptional() @IsString() samlSsoUrl?: string;
  @IsOptional() @IsString() samlCertificate?: string; // PEM
  @IsOptional() @IsString() oauthClientId?: string;
  @IsOptional() @IsString() oauthClientSecret?: string; // store encrypted
}
