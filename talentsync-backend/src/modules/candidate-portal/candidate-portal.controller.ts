import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { CandidatePortalService } from './candidate-portal.service';
import { PortalTokenGuard } from './guards';
import {
  ValidatePortalTokenDto,
  PortalCandidateDto,
  PortalInterviewDto,
  PortalDocumentDto,
  PortalUploadRequestDto,
  PortalUploadResponseDto,
  ConfirmUploadDto,
  PortalTokenValidationResponse,
} from './dto';

@ApiTags('candidate-portal')
@Controller('api/v1/portal')
export class CandidatePortalController {
  constructor(private readonly portalService: CandidatePortalService) {}

  /**
   * Validate a portal token - public endpoint, no guard
   */
  @Post('validate')
  @ApiOperation({ summary: 'Validate portal access token' })
  @ApiResponse({ status: 200, type: PortalTokenValidationResponse })
  async validateToken(
    @Body() dto: ValidatePortalTokenDto,
  ): Promise<PortalTokenValidationResponse> {
    try {
      const context = await this.portalService.validateToken(dto.token);
      const candidate = await this.portalService.getPortalProfile(
        context.tenantId,
        context.candidateId,
      );

      return {
        valid: true,
        candidate,
      };
    } catch (error) {
      return {
        valid: false,
        message: error.message || 'Invalid or expired token',
      };
    }
  }

  /**
   * Get candidate profile - requires valid portal token
   */
  @Get('me')
  @UseGuards(PortalTokenGuard)
  @ApiOperation({ summary: 'Get candidate profile for portal' })
  @ApiHeader({
    name: 'x-portal-token',
    required: true,
    description: 'Portal access token',
  })
  @ApiResponse({ status: 200, type: PortalCandidateDto })
  async getProfile(@Req() req: any): Promise<PortalCandidateDto> {
    return this.portalService.getPortalProfile(req.tenantId, req.candidateId);
  }

  /**
   * Get upcoming interviews - requires valid portal token
   */
  @Get('interviews')
  @UseGuards(PortalTokenGuard)
  @ApiOperation({ summary: 'Get upcoming interviews for candidate' })
  @ApiHeader({
    name: 'x-portal-token',
    required: true,
    description: 'Portal access token',
  })
  @ApiResponse({ status: 200, type: [PortalInterviewDto] })
  async getInterviews(@Req() req: any): Promise<PortalInterviewDto[]> {
    return this.portalService.getPortalInterviews(
      req.tenantId,
      req.candidateId,
    );
  }

  /**
   * Get documents - requires valid portal token
   */
  @Get('documents')
  @UseGuards(PortalTokenGuard)
  @ApiOperation({ summary: 'Get documents for candidate' })
  @ApiHeader({
    name: 'x-portal-token',
    required: true,
    description: 'Portal access token',
  })
  @ApiResponse({ status: 200, type: [PortalDocumentDto] })
  async getDocuments(@Req() req: any): Promise<PortalDocumentDto[]> {
    return this.portalService.getPortalDocuments(req.tenantId, req.candidateId);
  }

  /**
   * Generate upload URL for new document - requires valid portal token
   */
  @Post('documents')
  @UseGuards(PortalTokenGuard)
  @ApiOperation({ summary: 'Generate pre-signed upload URL for document' })
  @ApiHeader({
    name: 'x-portal-token',
    required: true,
    description: 'Portal access token',
  })
  @ApiResponse({ status: 201, type: PortalUploadResponseDto })
  async generateUploadUrl(
    @Req() req: any,
    @Body() dto: PortalUploadRequestDto,
  ): Promise<PortalUploadResponseDto> {
    return this.portalService.generateUploadUrl(
      req.tenantId,
      req.candidateId,
      dto.filename,
      dto.contentType,
    );
  }

  /**
   * Confirm document upload - requires valid portal token
   */
  @Put('documents/:id')
  @UseGuards(PortalTokenGuard)
  @ApiOperation({ summary: 'Confirm document upload' })
  @ApiHeader({
    name: 'x-portal-token',
    required: true,
    description: 'Portal access token',
  })
  @ApiResponse({ status: 200, type: PortalDocumentDto })
  async confirmUpload(
    @Req() req: any,
    @Param('id') fileId: string,
    @Body() dto: ConfirmUploadDto,
  ): Promise<PortalDocumentDto> {
    return this.portalService.confirmUpload(
      req.tenantId,
      fileId,
      dto.s3Key,
      dto.mimeType,
      dto.size,
    );
  }
}
