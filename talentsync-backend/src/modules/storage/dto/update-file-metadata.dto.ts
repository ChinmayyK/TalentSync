import { IsOptional, IsObject, IsString } from 'class-validator';

export class UpdateFileMetadataDto {
  @IsOptional()
  @IsObject()
  metadata?: any;

  @IsOptional()
  @IsString()
  status?: string; // active, deleted, quarantined
}
