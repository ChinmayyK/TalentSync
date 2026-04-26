import { IsString, IsBoolean, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for manual stage transitions
 */
export class TransitionStageDto {
  @ApiProperty({
    description: 'Target stage key (e.g., SCREENING, INTERVIEW_1)',
    example: 'INTERVIEW_1',
  })
  @IsString()
  newStage: string;

  @ApiPropertyOptional({
    description:
      'Reason for transition (required for override/backward transitions)',
    example: 'Moving to technical round after screening passed',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Allow override of stage ordering rules (ADMIN only)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  allowOverride?: boolean;
}

/**
 * DTO for rejecting a candidate
 */
export class RejectCandidateDto {
  @ApiProperty({
    description: 'Rejection reason (required, minimum 3 characters)',
    example: 'Candidate did not meet technical requirements',
  })
  @IsString()
  @MinLength(3)
  reason: string;
}

/**
 * Response DTO for stage transition operations
 */
export class StageTransitionResponseDto {
  @ApiProperty({ description: 'Whether the transition was successful' })
  success: boolean;

  @ApiProperty({ description: 'Candidate ID' })
  candidateId: string;

  @ApiProperty({ description: 'Stage before transition' })
  previousStage: string;

  @ApiProperty({ description: 'New stage after transition' })
  newStage: string;

  @ApiProperty({
    description: 'Type of transition',
    enum: ['FORWARD', 'BACKWARD', 'TERMINAL', 'OVERRIDE', 'SAME'],
  })
  transitionType: string;

  @ApiPropertyOptional({
    description: 'Warnings about the transition',
    type: [String],
  })
  warnings?: string[];
}

/**
 * Response DTO for stage history entries
 */
export class StageHistoryEntryDto {
  @ApiProperty({ description: 'History entry ID' })
  id: string;

  @ApiProperty({ description: 'Stage before transition' })
  previousStage: string;

  @ApiProperty({ description: 'Stage after transition' })
  newStage: string;

  @ApiProperty({
    description: 'Source of transition',
    enum: ['SYSTEM', 'USER'],
  })
  source: string;

  @ApiProperty({
    description: 'What triggered the transition',
    example: 'INTERVIEW_SCHEDULED',
  })
  triggeredBy: string;

  @ApiPropertyOptional({ description: 'User who initiated the transition' })
  actor?: {
    id: string;
    name: string | null;
    email: string;
  };

  @ApiPropertyOptional({ description: 'Reason for transition' })
  reason?: string;

  @ApiProperty({ description: 'Timestamp of transition' })
  createdAt: Date;
}
