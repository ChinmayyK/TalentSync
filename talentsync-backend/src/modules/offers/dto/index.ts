import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsDecimal,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum OfferStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
  WITHDRAWN = 'WITHDRAWN',
  COUNTERED = 'COUNTERED',
}

export enum SalaryType {
  ANNUAL = 'ANNUAL',
  MONTHLY = 'MONTHLY',
  HOURLY = 'HOURLY',
  WEEKLY = 'WEEKLY',
}

export class CreateOfferDto {
  @ApiProperty({ description: 'Candidate ID' })
  @IsString()
  candidateId: string;

  @ApiPropertyOptional({ description: 'Job ID' })
  @IsString()
  @IsOptional()
  jobId?: string;

  @ApiProperty({ description: 'Base salary amount' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  salary: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ enum: SalaryType, default: SalaryType.ANNUAL })
  @IsEnum(SalaryType)
  @IsOptional()
  salaryType?: SalaryType;

  @ApiPropertyOptional({ description: 'Bonus amount' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  bonus?: number;

  @ApiPropertyOptional({ description: 'Equity details' })
  @IsString()
  @IsOptional()
  equity?: string;

  @ApiPropertyOptional({ description: 'Proposed start date' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Offer expiry date' })
  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Position title' })
  @IsString()
  @IsOptional()
  position?: string;

  @ApiPropertyOptional({ description: 'Department' })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ description: 'Reporting manager' })
  @IsString()
  @IsOptional()
  reportingTo?: string;

  @ApiPropertyOptional({ description: 'Work location' })
  @IsString()
  @IsOptional()
  workLocation?: string;

  @ApiPropertyOptional({ description: 'Internal notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateOfferDto {
  @ApiPropertyOptional({ description: 'Base salary amount' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  salary?: number;

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ enum: SalaryType })
  @IsEnum(SalaryType)
  @IsOptional()
  salaryType?: SalaryType;

  @ApiPropertyOptional({ description: 'Bonus amount' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  bonus?: number;

  @ApiPropertyOptional({ description: 'Equity details' })
  @IsString()
  @IsOptional()
  equity?: string;

  @ApiPropertyOptional({ description: 'Proposed start date' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Offer expiry date' })
  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Position title' })
  @IsString()
  @IsOptional()
  position?: string;

  @ApiPropertyOptional({ description: 'Department' })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ description: 'Reporting manager' })
  @IsString()
  @IsOptional()
  reportingTo?: string;

  @ApiPropertyOptional({ description: 'Work location' })
  @IsString()
  @IsOptional()
  workLocation?: string;

  @ApiPropertyOptional({ description: 'Internal notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ enum: OfferStatus })
  @IsEnum(OfferStatus)
  @IsOptional()
  status?: OfferStatus;
}

export class QueryOffersDto {
  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsEnum(OfferStatus)
  @IsOptional()
  status?: OfferStatus;

  @ApiPropertyOptional({ description: 'Filter by candidate ID' })
  @IsString()
  @IsOptional()
  candidateId?: string;

  @ApiPropertyOptional({ description: 'Filter by job ID' })
  @IsString()
  @IsOptional()
  jobId?: string;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}

export class RespondToOfferDto {
  @ApiProperty({ enum: ['ACCEPTED', 'DECLINED', 'COUNTERED'] })
  @IsEnum(['ACCEPTED', 'DECLINED', 'COUNTERED'] as const)
  response: 'ACCEPTED' | 'DECLINED' | 'COUNTERED';

  @ApiPropertyOptional({ description: 'Reason for declining' })
  @IsString()
  @IsOptional()
  declineReason?: string;

  @ApiPropertyOptional({ description: 'Counter offer details' })
  @IsOptional()
  counterOffer?: {
    salary?: number;
    startDate?: string;
    notes?: string;
  };
}
