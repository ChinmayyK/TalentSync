import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({
    description: 'User email address',
    example: 'admin@company.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password (min 8 characters)',
    example: 'SecurePass123!',
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: 'User full name', example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Company/Tenant name', example: 'Acme Inc.' })
  @IsString()
  companyName: string;

  @ApiPropertyOptional({
    description: 'Optional company domain',
    example: 'acme.com',
  })
  @IsString()
  @IsOptional()
  domain?: string;
}
