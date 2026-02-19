import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import {
  IncidentSeverity,
  IncidentStatus,
  ComponentStatus,
} from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIncidentDto {
  @ApiProperty({ description: 'Incident title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ enum: IncidentSeverity })
  @IsOptional()
  @IsEnum(IncidentSeverity)
  severity?: IncidentSeverity;

  @ApiProperty({ description: 'IDs of affected components', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  componentIds: string[];

  @ApiPropertyOptional({ enum: ComponentStatus })
  @IsOptional()
  @IsEnum(ComponentStatus)
  impactLevel?: ComponentStatus;

  @ApiProperty({ description: 'Initial incident message' })
  @IsString()
  message: string;
}

export class UpdateIncidentDto {
  @ApiPropertyOptional({ description: 'Incident title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ enum: IncidentSeverity })
  @IsOptional()
  @IsEnum(IncidentSeverity)
  severity?: IncidentSeverity;

  @ApiPropertyOptional({ enum: IncidentStatus })
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;
}

export class AddIncidentUpdateDto {
  @ApiProperty({ enum: IncidentStatus })
  @IsEnum(IncidentStatus)
  status: IncidentStatus;

  @ApiProperty({ description: 'Update message' })
  @IsString()
  message: string;
}

export class OverrideComponentStatusDto {
  @ApiProperty({ enum: ComponentStatus, nullable: true })
  @IsOptional()
  @IsEnum(ComponentStatus)
  status?: ComponentStatus | null;
}

