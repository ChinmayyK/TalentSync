import {
  IsOptional,
  IsString,
  IsISO8601,
  IsInt,
  IsArray,
} from 'class-validator';

export class UpdateInterviewDto {
  @IsOptional()
  @IsString()
  stage?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  meetingLink?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsArray()
  interviewerIds?: string[];
}
