import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsOptional,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

class FieldMappingDto {
  @IsString()
  @IsNotEmpty()
  sourceField: string;

  @IsString()
  @IsNotEmpty()
  targetField: string;

  @IsOptional()
  @IsIn(['uppercase', 'lowercase', 'trim', 'none'])
  transform?: 'uppercase' | 'lowercase' | 'trim' | 'none';
}

export class UpdateMappingDto {
  @IsString()
  @IsNotEmpty()
  provider: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldMappingDto)
  mappings: FieldMappingDto[];

  @IsOptional()
  @IsIn(['push', 'pull', 'bidirectional'])
  direction?: 'push' | 'pull' | 'bidirectional';
}
