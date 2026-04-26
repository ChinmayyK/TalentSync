import { IsString, IsOptional, IsInt, IsBoolean, Min } from 'class-validator';

export class CreateSchedulingRuleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  minNoticeMins?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bufferBeforeMins?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bufferAfterMins?: number;

  @IsOptional()
  @IsInt()
  @Min(15)
  defaultSlotMins?: number;

  @IsOptional()
  @IsBoolean()
  allowOverlapping?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateSchedulingRuleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  minNoticeMins?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bufferBeforeMins?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bufferAfterMins?: number;

  @IsOptional()
  @IsInt()
  @Min(15)
  defaultSlotMins?: number;

  @IsOptional()
  @IsBoolean()
  allowOverlapping?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
