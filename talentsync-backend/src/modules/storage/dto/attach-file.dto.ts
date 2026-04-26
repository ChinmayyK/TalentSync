import { IsString, IsInt, IsOptional } from 'class-validator';

export class AttachFileDto {
  @IsString()
  fileId: string;

  @IsString()
  s3Key: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsInt()
  size?: number;
}
