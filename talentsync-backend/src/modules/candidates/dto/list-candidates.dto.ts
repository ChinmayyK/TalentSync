import { IsOptional, IsString, IsNumberString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListCandidatesDto {
  @ApiPropertyOptional({
    description: 'Filter by hiring stage',
    example: 'Interview',
  })
  @IsOptional()
  @IsString()
  stage?: string;

  @ApiPropertyOptional({ description: 'Filter by source', example: 'LinkedIn' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({
    description: 'Search query (name, email, phone)',
    example: 'john',
  })
  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Page number', example: '1' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ description: 'Items per page', example: '20' })
  @IsOptional()
  @IsNumberString()
  perPage?: string;

  @ApiPropertyOptional({
    description: 'Sort order (field:direction)',
    example: 'createdAt:desc',
  })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({ description: 'Filter by recruiter ID' })
  @IsOptional()
  @IsString()
  recruiterId?: string;

  @ApiPropertyOptional({
    description: 'Filter by date (from)',
    example: '2023-01-01',
  })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by date (to)',
    example: '2023-01-31',
  })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Search mode: simple (default) or boolean (advanced)',
    example: 'boolean',
    enum: ['simple', 'boolean'],
  })
  @IsOptional()
  @IsString()
  searchMode?: 'simple' | 'boolean';
}
