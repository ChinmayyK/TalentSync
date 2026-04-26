import {
  IsString,
  IsArray,
  IsOptional,
  ArrayMinSize,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Request to parse a single resume
 */
export class ParseResumeDto {
  @ApiProperty({
    description: 'ID of the uploaded file (from storage service)',
    example: 'clxyz123abc',
  })
  @IsString()
  fileId: string;
}

/**
 * Request to parse multiple resumes
 */
export class BulkParseResumesDto {
  @ApiProperty({
    description: 'Array of file IDs to parse',
    example: ['clxyz123abc', 'clxyz456def'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  fileIds: string[];
}

/**
 * Confidence flags for extracted fields
 */
export class FieldConfidenceDto {
  @ApiProperty({ description: 'Whether name was confidently extracted' })
  name: boolean;

  @ApiProperty({ description: 'Whether email was confidently extracted' })
  email: boolean;

  @ApiProperty({ description: 'Whether phone was confidently extracted' })
  phone: boolean;
}

/**
 * Extracted fields from resume
 */
export class ExtractedFieldsDto {
  @ApiPropertyOptional({ description: 'Extracted candidate name' })
  name?: string;

  @ApiPropertyOptional({ description: 'Extracted email address' })
  email?: string;

  @ApiPropertyOptional({ description: 'Extracted phone number' })
  phone?: string;

  @ApiProperty({
    description: 'Extracted skills (keyword-based)',
    type: [String],
  })
  skills: string[];

  @ApiPropertyOptional({ description: 'Raw experience text (unstructured)' })
  experience?: string;
}

/**
 * Parse result for a single resume
 */
export class ParsedResumeResponseDto {
  @ApiProperty({
    description: 'Parse status',
    enum: ['PARSED', 'PARTIALLY_PARSED', 'UNPARSABLE'],
  })
  status: 'PARSED' | 'PARTIALLY_PARSED' | 'UNPARSABLE';

  @ApiProperty({ description: 'Extracted fields', type: ExtractedFieldsDto })
  fields: ExtractedFieldsDto;

  @ApiProperty({
    description: 'Confidence flags for each field',
    type: FieldConfidenceDto,
  })
  confidence: FieldConfidenceDto;

  @ApiPropertyOptional({ description: 'Raw extracted text' })
  rawText?: string;

  @ApiProperty({ description: 'File ID that was parsed' })
  fileId: string;

  @ApiPropertyOptional({ description: 'Original filename' })
  filename?: string;
}

/**
 * Summary of bulk parse operation
 */
export class BulkParseSummaryDto {
  @ApiProperty({ description: 'Total files processed' })
  total: number;

  @ApiProperty({ description: 'Successfully parsed' })
  parsed: number;

  @ApiProperty({ description: 'Partially parsed' })
  partiallyParsed: number;

  @ApiProperty({ description: 'Failed to parse' })
  unparsable: number;
}

/**
 * Response for bulk parse operation
 */
export class BulkParseResponseDto {
  @ApiProperty({
    description: 'Parse results for each file',
    type: [ParsedResumeResponseDto],
  })
  results: ParsedResumeResponseDto[];

  @ApiProperty({ description: 'Summary of results', type: BulkParseSummaryDto })
  summary: BulkParseSummaryDto;
}

/**
 * Create candidate from parsed resume data
 * Allows recruiter to review/edit before saving
 */
export class CreateCandidateFromResumeDto {
  @ApiProperty({
    description: 'File ID of the parsed resume',
    example: 'clxyz123abc',
  })
  @IsString()
  fileId: string;

  @ApiProperty({
    description: 'Candidate name (reviewed/edited by recruiter)',
    example: 'John Doe',
  })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'john.doe@example.com',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+1 555-123-4567',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Skills extracted from resume',
    example: ['JavaScript', 'React', 'Node.js'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({
    description: 'Job title/role',
    example: 'Software Engineer',
  })
  @IsOptional()
  @IsString()
  roleTitle?: string;

  @ApiPropertyOptional({
    description: 'Initial stage key',
    example: 'APPLIED',
  })
  @IsOptional()
  @IsString()
  stage?: string;
}
