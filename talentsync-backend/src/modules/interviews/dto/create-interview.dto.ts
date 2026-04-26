import {
  IsString,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInterviewDto {
  @ApiProperty({
    description: 'ID of the candidate to interview',
    example: 'cand_abc123',
  })
  @IsString()
  candidateId: string;

  @ApiProperty({
    description: 'Array of interviewer user IDs',
    example: ['user_123', 'user_456'],
    type: [String],
  })
  @IsArray()
  interviewerIds: string[];

  @ApiProperty({
    description: 'Interview start time in ISO format',
    example: '2024-01-15T14:00:00Z',
  })
  @IsDateString()
  startAt: string;

  @ApiProperty({ description: 'Interview duration in minutes', example: 60 })
  @IsInt()
  durationMins: number;

  @ApiPropertyOptional({
    description: 'Interview stage/round',
    example: 'Technical Round',
  })
  @IsOptional()
  @IsString()
  stage?: string;

  @ApiPropertyOptional({
    description: 'Physical location or room',
    example: 'Conference Room A',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Video meeting link',
    example: 'https://meet.google.com/abc-xyz',
  })
  @IsOptional()
  @IsString()
  meetingLink?: string;

  @ApiPropertyOptional({
    description: 'Additional notes for interviewers',
    example: 'Focus on system design',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Custom subject for candidate email',
    example: 'Interview Invitation',
  })
  @IsOptional()
  @IsString()
  candidateEmailSubject?: string;

  @ApiPropertyOptional({
    description: 'Custom body for candidate email',
    example: 'Dear candidate...',
  })
  @IsOptional()
  @IsString()
  candidateEmailBody?: string;

  @ApiPropertyOptional({
    description: 'Custom subject for interviewer email',
    example: 'Interview Scheduled',
  })
  @IsOptional()
  @IsString()
  interviewerEmailSubject?: string;

  @ApiPropertyOptional({
    description: 'Custom body for interviewer email',
    example: 'Hi team...',
  })
  @IsOptional()
  @IsString()
  interviewerEmailBody?: string;
}
