import { IsEmail, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class CreateInvitationDto {
  @ApiProperty({
    description: 'Email address to invite',
    example: 'newuser@company.com',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'Role for the invited user',
    enum: Role,
    default: 'RECRUITER',
  })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @ApiPropertyOptional({ description: 'Name of the person being invited' })
  @IsString()
  @IsOptional()
  name?: string;
}
