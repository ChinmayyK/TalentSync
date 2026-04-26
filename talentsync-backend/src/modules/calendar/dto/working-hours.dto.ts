import {
  IsString,
  IsOptional,
  IsArray,
  IsDateString,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsTimezone } from '../../../common/validators/timezone.validator';

// Working Hours DTOs

export class WeeklyPatternDto {
  @IsInt()
  @Min(0)
  dow: number; // 0-6 (Sunday-Saturday)

  @IsString()
  start: string; // "09:00"

  @IsString()
  end: string; // "17:00"
}

export class SetWorkingHoursDto {
  @IsOptional()
  @IsString()
  userId?: string; // If not provided, use current user

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeeklyPatternDto)
  weekly: WeeklyPatternDto[];

  @IsTimezone()
  timezone: string; // IANA timezone

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}
