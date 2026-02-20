import { Test, TestingModule } from '@nestjs/testing';
import { TenantUsageService } from '../services/tenant-usage.service';
import { PrismaService } from '../../../common/prisma.service';

const mockPrisma = {
  tenant: {
    findMany: jest.fn(),
  },
  candidate: {
    count: jest.fn(),
  },
  interview: {
    count: jest.fn(),
  },
  messageLog: {
    count: jest.fn(),
  },
  fileObject: {
    aggregate: jest.fn(),
  },
};

describe('TenantUsageService', () => {
  let service: TenantUsageService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantUsageService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TenantUsageService>(TenantUsageService);
  });

  describe('getMetrics', () => {
    it('should return tenant usage metrics', async () => {
      mockPrisma.tenant.findMany.mockResolvedValue([
        { id: 'tenant1', name: 'Acme Corp' },
        { id: 'tenant2', name: 'Tech Inc' },
      ]);

      mockPrisma.candidate.count.mockResolvedValue(50);
      mockPrisma.interview.count.mockResolvedValue(25);
      mockPrisma.messageLog.count.mockResolvedValue(100);
      mockPrisma.fileObject.aggregate.mockResolvedValue({
        _sum: { size: 10485760 }, // 10 MB
      });

      const metrics = await service.getMetrics();

      expect(metrics).toHaveLength(2);
      expect(metrics[0]).toHaveProperty('tenantId');
      expect(metrics[0]).toHaveProperty('tenantName');
      expect(metrics[0]).toHaveProperty('candidates', 50);
      expect(metrics[0]).toHaveProperty('interviews', 25);
      expect(metrics[0]).toHaveProperty('messageVolume30d', 100);
      expect(metrics[0]).toHaveProperty('storageUsedMb', 10);
    });

    it('should handle tenants with no data', async () => {
      mockPrisma.tenant.findMany.mockResolvedValue([
        { id: 'tenant1', name: 'Empty Tenant' },
      ]);

      mockPrisma.candidate.count.mockResolvedValue(0);
      mockPrisma.interview.count.mockResolvedValue(0);
      mockPrisma.messageLog.count.mockResolvedValue(0);
      mockPrisma.fileObject.aggregate.mockResolvedValue({
        _sum: { size: null },
      });

      const metrics = await service.getMetrics();

      expect(metrics[0].candidates).toBe(0);
      expect(metrics[0].interviews).toBe(0);
      expect(metrics[0].messageVolume30d).toBe(0);
      expect(metrics[0].storageUsedMb).toBe(0);
    });

    it('should sort by most active tenants', async () => {
      mockPrisma.tenant.findMany.mockResolvedValue([
        { id: 'tenant1', name: 'Small Tenant' },
        { id: 'tenant2', name: 'Large Tenant' },
      ]);

      // First tenant: 10 candidates + 5 interviews = 15
      // Second tenant: 100 candidates + 50 interviews = 150
      mockPrisma.candidate.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(100);
      mockPrisma.interview.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(50);
      mockPrisma.messageLog.count.mockResolvedValue(0);
      mockPrisma.fileObject.aggregate.mockResolvedValue({
        _sum: { size: 0 },
      });

      const metrics = await service.getMetrics();

      expect(metrics[0].tenantName).toBe('Large Tenant');
      expect(metrics[1].tenantName).toBe('Small Tenant');
    });
  });

  describe('getTenantMetrics', () => {
    it('should return metrics for a specific tenant', async () => {
      mockPrisma.tenant.findMany.mockResolvedValue([
        { id: 'tenant1', name: 'Acme Corp' },
      ]);
      mockPrisma.candidate.count.mockResolvedValue(50);
      mockPrisma.interview.count.mockResolvedValue(25);
      mockPrisma.messageLog.count.mockResolvedValue(100);
      mockPrisma.fileObject.aggregate.mockResolvedValue({
        _sum: { size: 0 },
      });

      const metrics = await service.getTenantMetrics('tenant1');

      expect(metrics).toBeDefined();
      expect(metrics?.tenantId).toBe('tenant1');
    });

    it('should return null for unknown tenant', async () => {
      mockPrisma.tenant.findMany.mockResolvedValue([]);

      const metrics = await service.getTenantMetrics('unknown');

      expect(metrics).toBeNull();
    });
  });
});

