import { IsString, IsOptional } from 'class-validator';

export class BulkImportDto {
  @IsString() url: string; // S3 CSV file path or presigned URL
  @IsOptional() @IsString() mode?: string; // 'upsert' | 'create-only'
}
