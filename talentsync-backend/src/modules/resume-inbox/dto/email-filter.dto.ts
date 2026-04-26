import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum InboxEmailStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PARSED = 'PARSED',
  CANDIDATE_CREATED = 'CANDIDATE_CREATED',
  SKIPPED = 'SKIPPED',
  FAILED = 'FAILED',
  NO_RESUME = 'NO_RESUME',
}

export class EmailFilterDto {
  @ApiPropertyOptional({ description: 'Filter by inbox ID' })
  @IsString()
  @IsOptional()
  inboxId?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: InboxEmailStatus,
  })
  @IsEnum(InboxEmailStatus)
  @IsOptional()
  status?: InboxEmailStatus;

  @ApiPropertyOptional({
    description: 'Filter emails received after this date',
  })
  @IsDateString()
  @IsOptional()
  receivedAfter?: string;

  @ApiPropertyOptional({
    description: 'Filter emails received before this date',
  })
  @IsDateString()
  @IsOptional()
  receivedBefore?: string;

  @ApiPropertyOptional({ description: 'Search in subject or from address' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;
}
