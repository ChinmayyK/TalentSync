import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTeamDto {
  @ApiProperty({ description: 'Team name', example: 'Engineering Team' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({
    description: 'Team description',
    example: 'Backend development team',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Team lead user ID',
    example: 'user-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  leadId?: string;
}
