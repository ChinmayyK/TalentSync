import {
  IsString,
  IsDateString,
  IsInt,
  Min,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for rescheduling an interview via drag-and-drop
 */
export class RescheduleInterviewDto {
  @ApiProperty({
    description: 'New start date/time for the interview (ISO 8601)',
    example: '2025-01-15T10:00:00Z',
  })
  @IsDateString()
  newStartAt: string;

  @ApiProperty({
    description: 'New duration in minutes',
    example: 60,
    minimum: 15,
  })
  @IsInt()
  @Min(15)
  newDurationMins: number;

  @ApiPropertyOptional({
    description: 'Optional reason for rescheduling',
    example: 'Interviewer conflict',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Conflict information returned as warning
 */
export class ConflictInfoDto {
  @ApiProperty({ description: 'Conflicting interview ID' })
  interviewId: string;

  @ApiProperty({ description: 'Conflicting interview date' })
  date: Date;

  @ApiProperty({ description: 'Conflicting interview duration in minutes' })
  duration: number;

  @ApiPropertyOptional({ description: 'Interview stage' })
  stage?: string;
}

/**
 * Response DTO for reschedule operation
 */
export class RescheduleResponseDto {
  @ApiProperty({ description: 'Updated interview details' })
  interview: any;

  @ApiProperty({
    description: 'Conflict warnings (does not block the operation)',
    type: [ConflictInfoDto],
  })
  conflicts: ConflictInfoDto[];

  @ApiProperty({ description: 'Whether conflicts were detected' })
  hasConflicts: boolean;

  @ApiProperty({
    description: 'Human-readable result message',
    example: 'Interview rescheduled successfully',
  })
  message: string;
}
