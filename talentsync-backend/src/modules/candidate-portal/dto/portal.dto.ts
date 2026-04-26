import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidatePortalTokenDto {
  @ApiProperty({ description: 'Portal access token' })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class PortalCandidateDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty({ required: false })
  roleTitle?: string;

  @ApiProperty()
  stage: string;

  @ApiProperty({ required: false })
  photoUrl?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false, description: 'Company/tenant name' })
  companyName?: string;

  @ApiProperty({ required: false, description: 'Company logo URL' })
  companyLogoUrl?: string;
}

export class PortalInterviewDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  date: Date;

  @ApiProperty()
  durationMins: number;

  @ApiProperty()
  stage: string;

  @ApiProperty()
  status: string;

  @ApiProperty({ required: false })
  meetingLink?: string;

  @ApiProperty({ type: [String], description: 'Interviewer names' })
  interviewerNames: string[];
}

export class PortalDocumentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  filename: string;

  @ApiProperty({ required: false })
  mimeType?: string;

  @ApiProperty({ required: false })
  size?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false, description: 'Pre-signed download URL' })
  downloadUrl?: string;
}

export class PortalUploadRequestDto {
  @ApiProperty({ description: 'Filename for the document' })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({
    description: 'Content type/MIME type of the file',
    required: false,
  })
  @IsOptional()
  @IsString()
  contentType?: string;
}

export class PortalUploadResponseDto {
  @ApiProperty({ description: 'Pre-signed upload URL' })
  uploadUrl: string;

  @ApiProperty({ description: 'File ID to confirm upload' })
  fileId: string;

  @ApiProperty({ description: 'S3 key for the file' })
  s3Key: string;
}

export class ConfirmUploadDto {
  @ApiProperty({ description: 'S3 key from upload response' })
  @IsString()
  @IsNotEmpty()
  s3Key: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  size?: number;
}

export class PortalTokenValidationResponse {
  @ApiProperty()
  valid: boolean;

  @ApiProperty({ type: PortalCandidateDto, required: false })
  candidate?: PortalCandidateDto;

  @ApiProperty({ required: false })
  message?: string;
}
