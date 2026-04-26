import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { S3Service } from '../../common/s3.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { GenerateUploadUrlDto } from './dto/generate-upload-url.dto';
import { AttachFileDto } from './dto/attach-file.dto';
import { UpdateFileMetadataDto } from './dto/update-file-metadata.dto';
import { ListFilesDto } from './dto/list-files.dto';
import {
  getMimeType,
  isAllowedMimeType,
  validateFileSize,
} from './utils/mime.util';

@Injectable()
export class StorageService {
  constructor(
    private prisma: PrismaService,
    private s3: S3Service,
    @InjectQueue('file-scan') private scanQueue: Queue,
    @InjectQueue('file-text-extract') private extractQueue: Queue,
  ) {}

  async generateUploadUrl(
    tenantId: string,
    userId: string,
    dto: GenerateUploadUrlDto,
  ) {
    const mimeType = getMimeType(dto.filename);

    // Validate MIME type
    if (!isAllowedMimeType(mimeType, dto.linkedType)) {
      throw new BadRequestException(
        `File type ${mimeType} not allowed for ${dto.linkedType}`,
      );
    }

    // Check for existing versions
    let version = 1;
    if (dto.linkedType && dto.linkedId) {
      const existing = await this.prisma.fileObject.findMany({
        where: {
          tenantId,
          linkedType: dto.linkedType,
          linkedId: dto.linkedId,
          filename: dto.filename,
          status: { not: 'deleted' },
        },
        orderBy: { version: 'desc' },
        take: 1,
      });

      if (existing.length > 0) {
        version = existing[0].version + 1;
      }
    }

    // Create FileObject record
    const fileObject = await this.prisma.fileObject.create({
      data: {
        tenantId,
        ownerId: userId,
        linkedType: dto.linkedType,
        linkedId: dto.linkedId,
        filename: dto.filename,
        mimeType,
        version,
        status: 'pending',
        key: '', // Will be set on attach
      },
    });

    // Generate S3 key
    const s3Key = this.generateS3Key(
      tenantId,
      dto.linkedType,
      dto.linkedId,
      fileObject.id,
      dto.filename,
    );

    // Generate presigned upload URL
    const uploadUrl = await this.s3.getPresignedUploadUrl(s3Key, mimeType);

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'FILE_UPLOAD_INITIATED',
        metadata: { fileId: fileObject.id, filename: dto.filename },
      },
    });

    return {
      fileId: fileObject.id,
      uploadUrl,
      s3Key,
    };
  }

  async attachFile(tenantId: string, userId: string, dto: AttachFileDto) {
    const fileObject = await this.prisma.fileObject.findUnique({
      where: { id: dto.fileId },
    });

    if (!fileObject || fileObject.tenantId !== tenantId) {
      throw new NotFoundException('File not found');
    }

    // Validate file size
    if (dto.size && !validateFileSize(dto.size)) {
      throw new BadRequestException(
        'File size exceeds maximum allowed (100MB)',
      );
    }

    // Update FileObject
    const updated = await this.prisma.fileObject.update({
      where: { id: dto.fileId },
      data: {
        key: dto.s3Key,
        status: 'active',
        scanStatus: 'pending',
        mimeType: dto.mimeType || fileObject.mimeType,
        size: dto.size,
      },
    });

    // Enqueue scan job
    await this.scanQueue.add('scan', {
      fileId: dto.fileId,
      tenantId,
      s3Key: dto.s3Key,
    });

    // Enqueue text extraction if applicable
    if (
      dto.mimeType?.includes('pdf') ||
      dto.mimeType?.includes('word') ||
      dto.mimeType?.includes('document')
    ) {
      await this.extractQueue.add('extract', {
        fileId: dto.fileId,
        tenantId,
        s3Key: dto.s3Key,
        mimeType: dto.mimeType,
      });
    }

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'FILE_UPLOADED',
        metadata: { fileId: dto.fileId, s3Key: dto.s3Key, size: dto.size },
      },
    });

    return updated;
  }

  async listFiles(tenantId: string, dto: ListFilesDto) {
    const page = Number(dto.page) || 1;
    const perPage = Math.min(Number(dto.perPage) || 20, 100); // Cap at 100

    const where: any = { tenantId };

    if (dto.linkedType) where.linkedType = dto.linkedType;
    if (dto.linkedId) where.linkedId = dto.linkedId;
    if (dto.status) where.status = dto.status;
    if (dto.filename) {
      where.filename = { contains: dto.filename, mode: 'insensitive' };
    }

    const [total, data] = await Promise.all([
      this.prisma.fileObject.count({ where }),
      this.prisma.fileObject.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        perPage,
        lastPage: Math.ceil(total / perPage),
      },
    };
  }

  async getFile(tenantId: string, fileId: string) {
    const file = await this.prisma.fileObject.findUnique({
      where: { id: fileId },
    });

    if (!file || file.tenantId !== tenantId) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  async streamFile(tenantId: string, fileId: string, user: any) {
    const file = await this.getFile(tenantId, fileId);

    // RBAC check
    if (!this.canAccessFile(user, file)) {
      throw new ForbiddenException('Access denied');
    }

    // Generate presigned download URL (easier than streaming)
    const downloadUrl = await this.s3.getPresignedDownloadUrl(
      file.key,
      file.filename,
    );

    return { downloadUrl, filename: file.filename };
  }

  /**
   * Download file contents as Buffer (for server-side processing)
   */
  async downloadFile(key: string): Promise<Buffer> {
    return this.s3.downloadFile(key);
  }

  async updateMetadata(
    tenantId: string,
    fileId: string,
    dto: UpdateFileMetadataDto,
  ) {
    const file = await this.getFile(tenantId, fileId);

    return this.prisma.fileObject.update({
      where: { id: fileId },
      data: {
        metadata: dto.metadata !== undefined ? dto.metadata : file.metadata,
        status: dto.status || file.status,
      },
    });
  }

  async softDelete(tenantId: string, userId: string, fileId: string) {
    const file = await this.getFile(tenantId, fileId);

    await this.prisma.fileObject.update({
      where: { id: fileId },
      data: {
        status: 'deleted',
        deletedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'FILE_DELETED',
        metadata: { fileId },
      },
    });

    return { success: true };
  }

  async restoreFile(tenantId: string, userId: string, fileId: string) {
    const file = await this.getFile(tenantId, fileId);

    if (file.status !== 'deleted') {
      throw new BadRequestException('File is not deleted');
    }

    await this.prisma.fileObject.update({
      where: { id: fileId },
      data: {
        status: 'active',
        deletedAt: null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'FILE_RESTORED',
        metadata: { fileId },
      },
    });

    return { success: true };
  }

  async listVersions(tenantId: string, fileId: string) {
    const file = await this.getFile(tenantId, fileId);

    return this.prisma.fileObject.findMany({
      where: {
        tenantId,
        linkedType: file.linkedType,
        linkedId: file.linkedId,
        filename: file.filename,
      },
      orderBy: { version: 'desc' },
      take: 50, // Limit to 50 versions
    });
  }

  async getRecycleBin(tenantId: string, limit = 100) {
    return this.prisma.fileObject.findMany({
      where: {
        tenantId,
        status: 'deleted',
      },
      orderBy: { deletedAt: 'desc' },
      take: Math.min(limit, 200), // Cap at 200
    });
  }

  /**
   * Sanitize filename to prevent path traversal and special characters
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[\/\\]/g, '_') // Remove path separators
      .replace(/\.\.+/g, '_') // Remove multiple dots (path traversal)
      .replace(/[<>:"'|?*]/g, '_'); // Remove special characters
  }

  private generateS3Key(
    tenantId: string,
    linkedType?: string,
    linkedId?: string,
    fileId?: string,
    filename?: string,
  ): string {
    const safeFilename = filename ? this.sanitizeFilename(filename) : 'unnamed';
    if (linkedType && linkedId) {
      return `${tenantId}/${linkedType}/${linkedId}/files/${fileId}/${safeFilename}`;
    }
    return `${tenantId}/files/${fileId}/${safeFilename}`;
  }

  private canAccessFile(user: any, file: any): boolean {
    // CRITICAL: Must always check tenant first to prevent cross-tenant access
    if (file.tenantId !== user.tenantId) {
      return false;
    }

    // ADMINs and SUPERADMINs can access all files within their tenant
    if (['ADMIN', 'SUPERADMIN'].includes(user.role)) return true;

    if (file.linkedType === 'candidate') {
      return ['MANAGER', 'RECRUITER'].includes(user.role);
    }

    if (file.linkedType === 'interview') {
      return ['MANAGER', 'INTERVIEWER'].includes(user.role);
    }

    if (file.linkedType === 'user') {
      return file.linkedId === user.id;
    }

    return false;
  }
}
