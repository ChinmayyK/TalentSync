import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class CreateUserDto {
    @ApiProperty({ description: 'Email address', example: 'user@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ description: 'Full name', example: 'Jane Smith' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'User role', enum: Role, example: 'RECRUITER' })
    @IsEnum(Role)
    role: Role;

    @ApiProperty({ description: 'Initial password (optional)', required: false })
    @IsOptional()
    @IsString()
    password?: string;
}
