import { IsString, IsOptional } from 'class-validator';

export class GenerateUploadUrlDto {
  @IsString()
  filename: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  linkedType?: string; // 'candidate' | 'interview' | 'user' | 'resume'

  @IsOptional()
  @IsString()
  linkedId?: string;
}
