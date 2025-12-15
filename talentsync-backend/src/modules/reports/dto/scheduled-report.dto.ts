import {
  IsString,
  IsEnum,
  IsArray,
  IsOptional,
  IsInt,
  Min,
  Max,
  Matches,
  IsEmail,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ReportType {
  OVERVIEW = 'overview',
  FUNNEL = 'funnel',
  TIME_TO_HIRE = 'time-to-hire',
  INTERVIEWER_LOAD = 'interviewer-load',
  SOURCE_PERFORMANCE = 'source-performance',
  STAGE_METRICS = 'stage-metrics',
}

export enum ScheduleFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export class CreateScheduledReportDto {
  @ApiProperty({ description: 'Type of report to schedule', enum: ReportType })
  @IsEnum(ReportType)
  reportType: ReportType;

  @ApiProperty({
    description: 'Frequency of report delivery',
    enum: ScheduleFrequency,
  })
  @IsEnum(ScheduleFrequency)
  frequency: ScheduleFrequency;

  @ApiProperty({
    description: 'Email addresses to send report to',
    type: [String],
  })
  @IsArray()
  @IsEmail({}, { each: true })
  recipients: string[];

  @ApiProperty({
    description: 'Day of week for weekly reports (0=Sunday, 6=Saturday)',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiProperty({
    description: 'Day of month for monthly reports (1-28)',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(28)
  dayOfMonth?: number;

  @ApiProperty({
    description: 'Time to send report (HH:mm format)',
    example: '09:00',
  })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Time must be in HH:mm format',
  })
  time: string;

  @ApiProperty({ description: 'Report name/description', required: false })
  @IsOptional()
  @IsString()
  name?: string;
}

export class ScheduledReportResponseDto {
  id: string;
  tenantId: string;
  reportType: ReportType;
  frequency: ScheduleFrequency;
  recipients: string[];
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string;
  name?: string;
  isActive: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  createdAt: Date;
  createdById: string;
}

export enum ExportFormat {
  CSV = 'csv',
  PDF = 'pdf',
}

