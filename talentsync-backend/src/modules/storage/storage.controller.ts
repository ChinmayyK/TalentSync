import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { GenerateUploadUrlDto } from './dto/generate-upload-url.dto';
import { AttachFileDto } from './dto/attach-file.dto';
import { UpdateFileMetadataDto } from './dto/update-file-metadata.dto';
import { ListFilesDto } from './dto/list-files.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('storage')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/storage')
@UseGuards(JwtAuthGuard, RbacGuard)
export class StorageController {
  constructor(private storageService: StorageService) {}

  @Post('upload-url')
  @Roles('ADMIN', 'MANAGER', 'RECRUITER', 'INTERVIEWER')
  @ApiOperation({
    summary: 'Generate presigned upload URL for direct S3 upload',
  })
  @ApiBody({ type: GenerateUploadUrlDto })
  @ApiResponse({
    status: 201,
    description: 'Presigned URL generated',
    schema: {
      example: {
        uploadUrl: 'https://...',
        fileId: 'abc123',
        expiresAt: '2024-01-01T00:00:00Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  generateUploadUrl(@Req() req: any, @Body() dto: GenerateUploadUrlDto) {
    return this.storageService.generateUploadUrl(
      req.user.tenantId,
      req.user.sub,
      dto,
    );
  }

  @Post('attach')
  @Roles('ADMIN', 'MANAGER', 'RECRUITER', 'INTERVIEWER')
  @ApiOperation({ summary: 'Attach uploaded file to a candidate or interview' })
  @ApiBody({ type: AttachFileDto })
  @ApiResponse({ status: 201, description: 'File attached successfully' })
  @ApiResponse({ status: 404, description: 'Entity not found' })
  attachFile(@Req() req: any, @Body() dto: AttachFileDto) {
    return this.storageService.attachFile(req.user.tenantId, req.user.sub, dto);
  }

  @Get()
  @Roles('ADMIN', 'MANAGER', 'RECRUITER')
  @ApiOperation({ summary: 'List all files with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of files' })
  listFiles(@Req() req: any, @Query() dto: ListFilesDto) {
    return this.storageService.listFiles(req.user.tenantId, dto);
  }

  @Get('recycle-bin')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get soft-deleted files in recycle bin' })
  @ApiResponse({ status: 200, description: 'List of deleted files' })
  getRecycleBin(@Req() req: any) {
    return this.storageService.getRecycleBin(req.user.tenantId);
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER', 'RECRUITER', 'INTERVIEWER')
  @ApiOperation({ summary: 'Get file metadata and details' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File details' })
  @ApiResponse({ status: 404, description: 'File not found' })
  getFile(@Req() req: any, @Param('id') id: string) {
    return this.storageService.getFile(req.user.tenantId, id);
  }

  @Get(':id/download')
  @Roles('ADMIN', 'MANAGER', 'RECRUITER', 'INTERVIEWER')
  @ApiOperation({ summary: 'Download file or get presigned download URL' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File stream or download URL' })
  @ApiResponse({ status: 404, description: 'File not found' })
  downloadFile(@Req() req: any, @Param('id') id: string) {
    return this.storageService.streamFile(req.user.tenantId, id, req.user);
  }

  @Get(':id/versions')
  @Roles('ADMIN', 'MANAGER', 'RECRUITER')
  @ApiOperation({ summary: 'List all versions of a file' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'List of file versions' })
  @ApiResponse({ status: 404, description: 'File not found' })
  listVersions(@Req() req: any, @Param('id') id: string) {
    return this.storageService.listVersions(req.user.tenantId, id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update file metadata (name, tags, etc.)' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiBody({ type: UpdateFileMetadataDto })
  @ApiResponse({ status: 200, description: 'File metadata updated' })
  @ApiResponse({ status: 404, description: 'File not found' })
  updateMetadata(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateFileMetadataDto,
  ) {
    return this.storageService.updateMetadata(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Soft delete file (moves to recycle bin)' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File moved to recycle bin' })
  @ApiResponse({ status: 404, description: 'File not found' })
  deleteFile(@Req() req: any, @Param('id') id: string) {
    return this.storageService.softDelete(req.user.tenantId, req.user.sub, id);
  }

  @Post(':id/restore')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Restore file from recycle bin' })
  @ApiParam({ name: 'id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File restored' })
  @ApiResponse({ status: 404, description: 'File not found or not deleted' })
  restoreFile(@Req() req: any, @Param('id') id: string) {
    return this.storageService.restoreFile(req.user.tenantId, req.user.sub, id);
  }
}
