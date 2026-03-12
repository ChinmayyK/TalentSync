import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class InviteUserDto {
  @ApiProperty({
    description: 'Email address',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Full name', example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'User role', enum: Role, example: 'RECRUITER' })
  @IsEnum(Role)
  role: Role;

  @ApiProperty({
    description: 'Team IDs (optional)',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  teamIds?: string[];
}

