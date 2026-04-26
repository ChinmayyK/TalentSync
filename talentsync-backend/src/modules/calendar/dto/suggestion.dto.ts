import {
  IsArray,
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
  Min,
  Max,
  ArrayMaxSize,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// Max interviewers per panel - configurable via env
export const MAX_PANEL_INTERVIEWERS = parseInt(
  process.env.MAX_PANEL_INTERVIEWERS || '50',
  10,
);

export enum TimeOfDay {
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  EVENING = 'evening',
  ANY = 'any',
}

export class SlotPreferencesDto {
  @IsOptional()
  @IsEnum(TimeOfDay)
  preferredTimeOfDay?: TimeOfDay;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  preferredDays?: number[]; // 0-6 (Sun-Sat)

  @IsOptional()
  @IsBoolean()
  avoidBackToBack?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minGapBetweenInterviewsMins?: number; // Minimum gap for same candidate
}

export class SuggestionQueryDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_PANEL_INTERVIEWERS)
  userIds: string[]; // Required interviewers

  @IsOptional()
  @IsString()
  candidateId?: string; // Optional, for gap checking

  @IsNumber()
  @Min(15)
  @Max(480)
  durationMins: number;

  @IsString()
  startRange: string; // ISO date

  @IsString()
  endRange: string; // ISO date

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  maxSuggestions?: number; // Default 10

  @IsOptional()
  @ValidateNested()
  @Type(() => SlotPreferencesDto)
  preferences?: SlotPreferencesDto;

  @IsOptional()
  @IsString()
  ruleId?: string; // Scheduling rule ID
}

export class SlotSuggestionDto {
  start: string;
  end: string;
  score: number; // 0-100 ranking score
  reasons: string[]; // Explanation of ranking factors
  userAvailability: Record<string, boolean>;
}

export class SuggestionResponseDto {
  suggestions: SlotSuggestionDto[];
  totalAvailableSlots: number;
  queryRange: {
    start: string;
    end: string;
  };
  processingTimeMs: number;
}

// Team availability DTOs
export class TeamAvailabilityQueryDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_PANEL_INTERVIEWERS)
  @Transform(({ value }) => {
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value;
    return [];
  })
  userIds: string[];

  @IsString()
  start: string; // ISO date

  @IsString()
  end: string; // ISO date

  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(480)
  slotDurationMins?: number; // If provided, slice into discrete slots
}

export class UserAvailabilityDto {
  userId: string;
  userName?: string;
  intervals: Array<{
    start: string;
    end: string;
  }>;
}

export class TeamAvailabilityResponseDto {
  userAvailability: UserAvailabilityDto[];
  commonSlots: Array<{
    start: string;
    end: string;
  }>;
  queryRange: {
    start: string;
    end: string;
  };
}
