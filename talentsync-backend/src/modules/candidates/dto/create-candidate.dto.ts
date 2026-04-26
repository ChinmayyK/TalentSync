import {
  IsString,
  IsOptional,
  IsEmail,
  IsArray,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCandidateDto {
  @ApiProperty({
    description: 'Candidate full name',
    example: 'John Doe',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Candidate email address',
    example: 'john.doe@email.com',
    maxLength: 255,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    description: 'Candidate phone number',
    example: '+1 555-123-4567',
    maxLength: 30,
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(/^[+]?[\d\s\-().]+$/, { message: 'Invalid phone format' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Job title/role being applied for',
    example: 'Senior Software Engineer',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  roleTitle?: string;

  @ApiPropertyOptional({
    description: 'Hiring stage',
    example: 'Applied',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  stage?: string;

  @ApiPropertyOptional({
    description: 'Source of the candidate',
    example: 'LinkedIn',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;

  @ApiPropertyOptional({
    description: 'Tags for categorization',
    example: ['frontend', 'react', 'senior'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Notes about the candidate' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Resume URL (S3 Key)' })
  @IsOptional()
  @IsString()
  resumeUrl?: string;

  @ApiPropertyOptional({ description: 'Vendor ID if submitted by agency' })
  @IsOptional()
  @IsString()
  vendorId?: string;
}
