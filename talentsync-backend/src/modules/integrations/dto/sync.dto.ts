import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsIn,
} from 'class-validator';

export class TriggerSyncDto {
  @IsString()
  @IsNotEmpty()
  provider: string;

  @IsOptional()
  @IsDateString()
  since?: string;

  @IsOptional()
  @IsString()
  @IsIn(['leads', 'contacts', 'both'])
  module?: 'leads' | 'contacts' | 'both';
}
