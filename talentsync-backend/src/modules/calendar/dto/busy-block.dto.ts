import { IsString, IsOptional, IsDateString, IsObject } from 'class-validator';

export class CreateBusyBlockDto {
  @IsOptional()
  @IsString()
  userId?: string; // If not provided, use current user

  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class BusyBlockQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsDateString()
  start?: string;

  @IsOptional()
  @IsDateString()
  end?: string;

  @IsOptional()
  @IsString()
  source?: string;
}
