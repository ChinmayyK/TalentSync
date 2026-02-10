import { IsOptional, IsString } from 'class-validator';

export class ListFeedbackDto {
  @IsOptional()
  @IsString()
  interviewId?: string;

  @IsOptional()
  @IsString()
  candidateId?: string;

  @IsOptional()
  @IsString()
  interviewerId?: string;
}

