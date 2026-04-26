import { IsString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateApiKeyDto {
  @ApiProperty({
    description: 'API key name/label',
    example: 'Production Integration',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Permission scopes for this API key',
    example: ['candidates:read', 'candidates:write', 'interviews:read'],
    type: [String],
  })
  @IsArray()
  scopes: string[];
}
