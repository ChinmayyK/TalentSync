import {
  IsArray,
  IsISO8601,
  IsInt,
  IsString,
  IsEnum,
  IsOptional,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsTimezone } from '../../../common/validators/timezone.validator';

/**
 * Bulk scheduling mode - explicit selection required
 * SEQUENTIAL: One interview per candidate, times staggered by duration
 * GROUP: One interview for all candidates at same time
 */
export enum BulkMode {
  SEQUENTIAL = 'SEQUENTIAL',
  GROUP = 'GROUP',
}

// Keep old enum for backward compatibility during transition
/** @deprecated Use BulkMode instead */
export enum BulkScheduleStrategy {
  AUTO = 'AUTO',
  SAME_TIME = 'SAME_TIME',
  PER_CANDIDATE = 'PER_CANDIDATE',
}

/**
 * DTO for bulk scheduling interviews for multiple candidates
 * Requires explicit mode selection - no implicit behavior
 */
export class BulkScheduleDto {
  @ApiProperty({
    description: 'Array of candidate IDs to schedule',
    example: ['cand_123', 'cand_456', 'cand_789'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  candidateIds: string[];

  @ApiProperty({
    description: 'Array of interviewer user IDs',
    example: ['user_abc', 'user_def'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  interviewerIds: string[];

  @ApiProperty({
    description: 'Interview duration in minutes (min 15)',
    example: 60,
    minimum: 15,
  })
  @IsInt()
  @Min(15)
  durationMins: number;

  @ApiProperty({
    description:
      'Bulk scheduling mode - REQUIRED. SEQUENTIAL creates one interview per candidate with staggered times. GROUP creates one interview for all candidates at same time.',
    enum: BulkMode,
    example: BulkMode.SEQUENTIAL,
  })
  @IsEnum(BulkMode)
  bulkMode: BulkMode;

  @ApiProperty({
    description:
      'Start time for the first interview (ISO 8601). For SEQUENTIAL, subsequent interviews are offset by duration.',
    example: '2024-01-15T14:00:00Z',
  })
  @IsISO8601()
  startTime: string;

  @ApiPropertyOptional({
    description: 'Interview stage/round',
    example: 'Technical Round',
  })
  @IsOptional()
  @IsString()
  stage?: string;

  @ApiPropertyOptional({
    description: 'Timezone for scheduling',
    example: 'Asia/Kolkata',
  })
  @IsOptional()
  @IsTimezone()
  timezone?: string;

  // Legacy fields - kept for backward compatibility
  /** @deprecated Use bulkMode instead */
  @IsOptional()
  @IsEnum(BulkScheduleStrategy)
  strategy?: BulkScheduleStrategy;

  /** @deprecated Use startTime instead */
  @IsOptional()
  @IsISO8601()
  scheduledTime?: string;
}

/**
 * Result of bulk scheduling operation
 */
export interface BulkScheduleResult {
  /** Total number of candidates in request */
  total: number;
  /** Number successfully scheduled */
  scheduled: number;
  /** Number skipped/failed */
  skipped: number;
  /** Bulk batch ID linking all created interviews */
  bulkBatchId: string;
  /** Mode used for scheduling */
  bulkMode: BulkMode;
  /** Successfully created interviews */
  created: Array<{
    candidateId: string;
    interviewId: string;
    scheduledAt: string;
  }>;
  /** Skipped candidates with reasons */
  skippedCandidates: Array<{
    candidateId: string;
    reason: string;
  }>;
}
