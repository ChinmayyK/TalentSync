import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobBoardProvider } from './enums';

/**
 * DTO for saving job board credentials per tenant
 */
export class SaveJobBoardCredentialsDto {
  @ApiProperty({ enum: JobBoardProvider, description: 'Job board provider' })
  @IsEnum(JobBoardProvider)
  provider: JobBoardProvider;

  @ApiPropertyOptional({ description: 'API key for the provider' })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiPropertyOptional({ description: 'API secret for the provider' })
  @IsString()
  @IsOptional()
  apiSecret?: string;

  @ApiPropertyOptional({ description: 'Employer/Company ID' })
  @IsString()
  @IsOptional()
  employerId?: string;

  @ApiPropertyOptional({ description: 'OAuth access token' })
  @IsString()
  @IsOptional()
  accessToken?: string;

  @ApiPropertyOptional({ description: 'OAuth refresh token' })
  @IsString()
  @IsOptional()
  refreshToken?: string;

  @ApiPropertyOptional({ description: 'OAuth client ID' })
  @IsString()
  @IsOptional()
  clientId?: string;

  @ApiPropertyOptional({ description: 'OAuth client secret' })
  @IsString()
  @IsOptional()
  clientSecret?: string;
}

/**
 * DTO for posting to multiple job boards
 */
export class BatchPostDto {
  @ApiProperty({ description: 'Job ID to post' })
  @IsString()
  jobId: string;

  @ApiProperty({
    enum: JobBoardProvider,
    isArray: true,
    description: 'List of providers to post to',
  })
  @IsArray()
  @IsEnum(JobBoardProvider, { each: true })
  providers: JobBoardProvider[];

  @ApiPropertyOptional({ description: 'Custom title override' })
  @IsString()
  @IsOptional()
  customTitle?: string;

  @ApiPropertyOptional({ description: 'Custom description override' })
  @IsString()
  @IsOptional()
  customDescription?: string;

  @ApiPropertyOptional({ description: 'Sponsor/boost the postings' })
  @IsOptional()
  sponsored?: boolean;
}

/**
 * Response for batch posting
 */
export interface BatchPostResponse {
  total: number;
  successful: number;
  failed: number;
  results: {
    provider: JobBoardProvider;
    success: boolean;
    postingId?: string;
    externalId?: string;
    externalUrl?: string;
    error?: string;
  }[];
}
