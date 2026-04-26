import {
  IsInt,
  IsString,
  IsOptional,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitFeedbackDto {
  @ApiProperty({
    description: 'ID of the interview to submit feedback for',
    example: 'int_abc123',
  })
  @IsString()
  interviewId: string;

  @ApiProperty({
    description: 'Overall rating (1-5 scale)',
    example: 4,
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({
    description: 'Detailed criteria ratings',
    example: { communication: 4, problemSolving: 5, technicalSkills: 4 },
  })
  @IsOptional()
  @IsObject()
  criteria?: Record<string, number>;

  @ApiPropertyOptional({
    description: 'Additional comments or notes',
    example: 'Strong candidate with good communication skills',
  })
  @IsOptional()
  @IsString()
  comments?: string;
}
