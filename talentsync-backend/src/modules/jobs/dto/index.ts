import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum JobStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  ON_HOLD = 'ON_HOLD',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum LocationType {
  ONSITE = 'ONSITE',
  REMOTE = 'REMOTE',
  HYBRID = 'HYBRID',
}

export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  INTERNSHIP = 'INTERNSHIP',
  TEMPORARY = 'TEMPORARY',
  FREELANCE = 'FREELANCE',
}

export enum JobVisibility {
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
}

export enum JobPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class CreateJobDto {
  @ApiProperty({ description: 'Job title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Job description (supports HTML)' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Job requirements' })
  @IsString()
  @IsOptional()
  requirements?: string;

  @ApiPropertyOptional({ description: 'Department' })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ description: 'Job location' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ enum: LocationType, default: LocationType.ONSITE })
  @IsEnum(LocationType)
  @IsOptional()
  locationType?: LocationType;

  @ApiPropertyOptional({
    enum: EmploymentType,
    default: EmploymentType.FULL_TIME,
  })
  @IsEnum(EmploymentType)
  @IsOptional()
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ description: 'Minimum salary' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  salaryMin?: number;

  @ApiPropertyOptional({ description: 'Maximum salary' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  salaryMax?: number;

  @ApiPropertyOptional({ description: 'Salary currency', default: 'USD' })
  @IsString()
  @IsOptional()
  salaryCurrency?: string;

  @ApiPropertyOptional({ description: 'Number of openings', default: 1 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  openings?: number;

  @ApiPropertyOptional({ description: 'Application closing date' })
  @IsDateString()
  @IsOptional()
  closingDate?: string;

  @ApiPropertyOptional({ description: 'Hiring manager user ID' })
  @IsString()
  @IsOptional()
  hiringManagerId?: string;

  @ApiPropertyOptional({ description: 'Recruiter user ID' })
  @IsString()
  @IsOptional()
  recruiterId?: string;

  @ApiPropertyOptional({ description: 'Required skills', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @ApiPropertyOptional({ description: 'Benefits offered', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  benefits?: string[];

  @ApiPropertyOptional({
    description: 'Tags for categorization',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'City for the job opening' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'Client/Company name for the job' })
  @IsString()
  @IsOptional()
  clientName?: string;

  @ApiPropertyOptional({
    description: 'Assigned recruiter user IDs',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  assignedRecruiterIds?: string[];

  @ApiPropertyOptional({ enum: JobVisibility, default: JobVisibility.INTERNAL })
  @IsEnum(JobVisibility)
  @IsOptional()
  visibility?: JobVisibility;

  @ApiPropertyOptional({ enum: JobPriority, default: JobPriority.NORMAL })
  @IsEnum(JobPriority)
  @IsOptional()
  priority?: JobPriority;
}

export class UpdateJobDto extends CreateJobDto {
  @ApiPropertyOptional({ enum: JobStatus })
  @IsEnum(JobStatus)
  @IsOptional()
  status?: JobStatus;
}

export class QueryJobsDto {
  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsEnum(JobStatus)
  @IsOptional()
  status?: JobStatus;

  @ApiPropertyOptional({ description: 'Filter by department' })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ description: 'Filter by location type' })
  @IsEnum(LocationType)
  @IsOptional()
  locationType?: LocationType;

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
  @Max(100)
  @Type(() => Number)
  limit?: number;
}
