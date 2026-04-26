import {
  IsString,
  IsEmail,
  IsInt,
  IsBoolean,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateResumeInboxDto {
  @ApiProperty({
    description: 'Display name for the inbox',
    example: 'Careers Inbox',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Email address of the inbox',
    example: 'careers@company.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'IMAP server hostname',
    example: 'imap.gmail.com',
  })
  @IsString()
  imapHost: string;

  @ApiPropertyOptional({ description: 'IMAP server port', default: 993 })
  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  imapPort?: number = 993;

  @ApiProperty({ description: 'IMAP username', example: 'careers@company.com' })
  @IsString()
  imapUser: string;

  @ApiProperty({ description: 'IMAP password or app password' })
  @IsString()
  imapPassword: string;

  @ApiPropertyOptional({ description: 'Use TLS for connection', default: true })
  @IsBoolean()
  @IsOptional()
  useTls?: boolean = true;

  @ApiPropertyOptional({ description: 'Enable the inbox', default: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean = true;

  @ApiPropertyOptional({ description: 'Minutes between polls', default: 5 })
  @IsInt()
  @Min(1)
  @Max(60)
  @IsOptional()
  pollInterval?: number = 5;

  @ApiPropertyOptional({
    description: 'Auto-parse resumes immediately',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  autoProcess?: boolean = false;

  @ApiPropertyOptional({
    description: 'Auto-create candidates from parsed resumes',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  autoCreate?: boolean = false;

  @ApiPropertyOptional({
    description: 'Default job ID to assign new candidates to',
  })
  @IsString()
  @IsOptional()
  defaultJobId?: string;
}
