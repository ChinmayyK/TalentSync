import { IsOptional, IsString, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBrandingDto {
  @ApiPropertyOptional({
    description: 'URL to company logo',
    example: 'https://example.com/logo.png',
  })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Primary brand color (hex)',
    example: '#3B82F6',
  })
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiPropertyOptional({
    description: 'Accent brand color (hex)',
    example: '#10B981',
  })
  @IsOptional()
  @IsString()
  accentColor?: string;

  @ApiPropertyOptional({
    description: 'Additional branding options',
    example: { favicon: 'https://...' },
  })
  @IsOptional()
  @IsObject()
  other?: any;
}
