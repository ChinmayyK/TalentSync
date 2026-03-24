import { IsOptional, IsString, IsNumberString } from 'class-validator';

export class ListFilesDto {
  @IsOptional()
  @IsString()
  linkedType?: string;

  @IsOptional()
  @IsString()
  linkedId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  filename?: string; // Search by filename

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  perPage?: string;
}

