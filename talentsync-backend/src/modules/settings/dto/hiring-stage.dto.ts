import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  Min,
  Matches,
} from 'class-validator';

export class CreateHiringStageDto {
  @IsString()
  name: string;

  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message:
      'Key must be uppercase with underscores (e.g., SCREENING, INTERVIEW_1)',
  })
  key: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateHiringStageDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class ReorderHiringStagesDto {
  @IsArray()
  @IsString({ each: true })
  stageIds: string[];
}

// Response type for API
export interface HiringStageResponse {
  id: string;
  tenantId: string;
  name: string;
  key: string;
  order: number;
  color: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

