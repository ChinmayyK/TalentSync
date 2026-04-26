import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from '../storage.service';
import { PrismaService } from '../../../common/prisma.service';
import { S3Service } from '../../../common/s3.service';
import { Queue } from 'bullmq';

describe('StorageService', () => {
  let service: StorageService;
  let prisma: PrismaService;
  let s3: S3Service;

  const mockPrismaService = {
    fileObject: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const mockS3Service = {
    getPresignedUploadUrl: jest.fn(),
    getPresignedDownloadUrl: jest.fn(),
    streamFile: jest.fn(),
    deleteFile: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  } as unknown as Queue;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
        {
          provide: 'BullQueue_file-scan',
          useValue: mockQueue,
        },
        {
          provide: 'BullQueue_file-text-extract',
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    prisma = module.get<PrismaService>(PrismaService);
    s3 = module.get<S3Service>(S3Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateUploadUrl', () => {
    it('should create FileObject and return presigned URL', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const dto = {
        filename: 'resume.pdf',
        linkedType: 'candidate',
        linkedId: 'cand-123',
      };

      mockPrismaService.fileObject.findMany.mockResolvedValue([]);
      mockPrismaService.fileObject.create.mockResolvedValue({
        id: 'file-123',
        filename: 'resume.pdf',
        version: 1,
      });
      mockS3Service.getPresignedUploadUrl.mockResolvedValue(
        'https://s3.amazonaws.com/...',
      );
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.generateUploadUrl(tenantId, userId, dto);

      expect(result).toHaveProperty('fileId');
      expect(result).toHaveProperty('uploadUrl');
      expect(result).toHaveProperty('s3Key');
      expect(mockPrismaService.fileObject.create).toHaveBeenCalled();
      expect(mockS3Service.getPresignedUploadUrl).toHaveBeenCalled();
    });

    it('should increment version for existing file', async () => {
      mockPrismaService.fileObject.findMany.mockResolvedValue([{ version: 2 }]);
      mockPrismaService.fileObject.create.mockResolvedValue({
        id: 'file-124',
        version: 3,
      });
      mockS3Service.getPresignedUploadUrl.mockResolvedValue(
        'https://s3.amazonaws.com/...',
      );
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.generateUploadUrl('tenant-123', 'user-123', {
        filename: 'resume.pdf',
        linkedType: 'candidate',
        linkedId: 'cand-123',
      });

      expect(mockPrismaService.fileObject.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ version: 3 }),
        }),
      );
    });
  });

  describe('attachFile', () => {
    it('should update FileObject and enqueue scan job', async () => {
      mockPrismaService.fileObject.findUnique.mockResolvedValue({
        id: 'file-123',
        tenantId: 'tenant-123',
        mimeType: 'application/pdf',
      });
      mockPrismaService.fileObject.update.mockResolvedValue({});
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.attachFile('tenant-123', 'user-123', {
        fileId: 'file-123',
        s3Key: 'tenant-123/candidates/cand-123/files/file-123/resume.pdf',
        mimeType: 'application/pdf',
        size: 1024000,
      });

      expect(mockPrismaService.fileObject.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'active',
            scanStatus: 'pending',
          }),
        }),
      );
      expect(mockQueue.add).toHaveBeenCalledWith('scan', expect.any(Object));
    });
  });

  describe('softDelete', () => {
    it('should mark file as deleted', async () => {
      mockPrismaService.fileObject.findUnique.mockResolvedValue({
        id: 'file-123',
        tenantId: 'tenant-123',
      });
      mockPrismaService.fileObject.update.mockResolvedValue({});
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.softDelete(
        'tenant-123',
        'user-123',
        'file-123',
      );

      expect(result.success).toBe(true);
      expect(mockPrismaService.fileObject.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'deleted',
            deletedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('restoreFile', () => {
    it('should restore deleted file', async () => {
      mockPrismaService.fileObject.findUnique.mockResolvedValue({
        id: 'file-123',
        tenantId: 'tenant-123',
        status: 'deleted',
      });
      mockPrismaService.fileObject.update.mockResolvedValue({});
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.restoreFile(
        'tenant-123',
        'user-123',
        'file-123',
      );

      expect(result.success).toBe(true);
      expect(mockPrismaService.fileObject.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'active',
            deletedAt: null,
          }),
        }),
      );
    });
  });
});
