import { IsString, IsInt, IsOptional } from 'class-validator';

export class CreateFeedbackDto {
  @IsString()
  interviewId: string;

  @IsString()
  interviewerId: string;

  @IsInt()
  rating: number; // e.g., 1-5

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsString()
  scorecardJson?: string; // optional structured scorecard as JSON string
}
