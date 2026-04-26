import { IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListInterviewsDto {
  @ApiPropertyOptional({
    description: 'Filter by interviewer ID',
    example: 'user_123',
  })
  @IsOptional()
  @IsString()
  interviewerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by candidate ID',
    example: 'cand_abc123',
  })
  @IsOptional()
  @IsString()
  candidateId?: string;

  @ApiPropertyOptional({
    description: 'Filter interviews from this date',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Filter interviews until this date',
    example: '2024-01-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    example: 'SCHEDULED',
    enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Page number', example: '1' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ description: 'Items per page', example: '20' })
  @IsOptional()
  @IsString()
  perPage?: string;

  @ApiPropertyOptional({
    description: 'Sort order (field:direction)',
    example: 'startAt:asc',
  })
  @IsOptional()
  @IsString()
  sort?: string;
}
