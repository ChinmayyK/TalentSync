import {
  IsString,
  IsOptional,
  IsEnum,
  IsUrl,
  IsDateString,
  IsArray,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// Export enums first (before credentials which depends on them)
export { JobBoardProvider, JobPostingStatus } from './enums';
import { JobBoardProvider, JobPostingStatus } from './enums';

// Re-export credentials DTOs
export * from './credentials.dto';

/**
 * DTO for posting a job to an external board
 */
export class PostJobDto {
  @ApiProperty({ description: 'Job ID to post' })
  @IsString()
  jobId: string;

  @ApiProperty({ enum: JobBoardProvider })
  @IsEnum(JobBoardProvider)
  provider: JobBoardProvider;

  @ApiPropertyOptional({ description: 'Custom title override' })
  @IsString()
  @IsOptional()
  customTitle?: string;

  @ApiPropertyOptional({ description: 'Custom description override' })
  @IsString()
  @IsOptional()
  customDescription?: string;

  @ApiPropertyOptional({ description: 'Expiry date for posting' })
  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Sponsor/boost the posting' })
  @IsOptional()
  sponsored?: boolean;
}

/**
 * DTO for updating a job posting
 */
export class UpdateJobPostingDto {
  @ApiPropertyOptional({ description: 'Updated title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Updated description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: JobPostingStatus })
  @IsEnum(JobPostingStatus)
  @IsOptional()
  status?: JobPostingStatus;
}

/**
 * DTO for querying job postings
 */
export class QueryJobPostingsDto {
  @ApiPropertyOptional({ description: 'Filter by job ID' })
  @IsString()
  @IsOptional()
  jobId?: string;

  @ApiPropertyOptional({ enum: JobBoardProvider })
  @IsEnum(JobBoardProvider)
  @IsOptional()
  provider?: JobBoardProvider;

  @ApiPropertyOptional({ enum: JobPostingStatus })
  @IsEnum(JobPostingStatus)
  @IsOptional()
  status?: JobPostingStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

/**
 * Response from job board provider
 */
export interface JobPostingResponse {
  externalId: string;
  externalUrl?: string;
  status: JobPostingStatus;
  message?: string;
}

/**
 * Job posting record
 */
export interface JobPosting {
  id: string;
  tenantId: string;
  jobId: string;
  provider: JobBoardProvider;
  externalId?: string;
  externalUrl?: string;
  title: string;
  description: string;
  status: JobPostingStatus;
  sponsored: boolean;
  postedAt?: Date;
  expiresAt?: Date;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Provider credentials configuration
 */
export interface ProviderCredentials {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  employerId?: string;
}
