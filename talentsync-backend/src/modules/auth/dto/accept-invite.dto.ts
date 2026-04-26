import { IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AcceptInviteDto {
  @ApiProperty({ description: 'Invitation token from email link' })
  @IsString()
  token: string;

  @ApiProperty({
    description: 'Password for the new account (min 8 characters)',
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ description: 'User full name (if not already set)' })
  @IsString()
  @IsOptional()
  name?: string;
}
