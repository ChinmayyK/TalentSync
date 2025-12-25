import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ManualSubmissionResponseDto {
  runId: string;
  runTimestamp: string;
  triggeredBy: string;
  totalScanned: number;
  submitted: number;
  skipped: number;
  failures: Array<{
    interviewId: string;
    candidateId?: string;
    reason: string;
  }>;
}

export class TriggerManualSubmissionDto {
  @ApiPropertyOptional({ description: 'Optional remarks for audit trail' })
  @IsOptional()
  @IsString()
  remarks?: string;
}
