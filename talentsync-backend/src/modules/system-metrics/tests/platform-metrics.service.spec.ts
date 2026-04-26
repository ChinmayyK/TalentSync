import { Test, TestingModule } from '@nestjs/testing';
import { PlatformMetricsService } from '../services/platform-metrics.service';

// Mock Redis
const mockRedis = {
  pipeline: jest.fn().mockReturnThis(),
  incr: jest.fn().mockReturnThis(),
  expire: jest.fn().mockReturnThis(),
  zadd: jest.fn().mockReturnThis(),
  zremrangebyscore: jest.fn().mockReturnThis(),
  sadd: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue([]),
  get: jest.fn(),
  zrange: jest.fn(),
  scard: jest.fn(),
  del: jest.fn().mockResolvedValue(1),
  disconnect: jest.fn(),
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedis);
});

describe('PlatformMetricsService', () => {
  let service: PlatformMetricsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [PlatformMetricsService],
    }).compile();

    service = module.get<PlatformMetricsService>(PlatformMetricsService);
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('recordRequest', () => {
    it('should record a successful request', async () => {
      await service.recordRequest(150, false, 'tenant1', 'user1');

      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockRedis.incr).toHaveBeenCalled();
      expect(mockRedis.sadd).toHaveBeenCalled();
      expect(mockRedis.exec).toHaveBeenCalled();
    });

    it('should record an error request', async () => {
      await service.recordRequest(200, true, 'tenant1', 'user1');

      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockRedis.incr).toHaveBeenCalledTimes(2); // requests + errors
      expect(mockRedis.exec).toHaveBeenCalled();
    });
  });

  describe('getMetrics', () => {
    it('should return metrics with correct structure', async () => {
      mockRedis.get.mockResolvedValueOnce('100'); // requests
      mockRedis.get.mockResolvedValueOnce('5'); // errors
      mockRedis.zrange.mockResolvedValueOnce([
        '50:123',
        '100:456',
        '150:789',
        '200:012',
        '250:345',
      ]);
      mockRedis.scard.mockResolvedValueOnce(10); // tenants
      mockRedis.scard.mockResolvedValueOnce(50); // users

      const metrics = await service.getMetrics();

      expect(metrics).toHaveProperty('apiRequests24h', 100);
      expect(metrics).toHaveProperty('errorRate', 5);
      expect(metrics).toHaveProperty('activeTenants7d', 10);
      expect(metrics).toHaveProperty('activeUsers7d', 50);
      expect(metrics).toHaveProperty('p95Latency');
    });

    it('should handle empty metrics', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.zrange.mockResolvedValue([]);
      mockRedis.scard.mockResolvedValue(0);

      const metrics = await service.getMetrics();

      expect(metrics.apiRequests24h).toBe(0);
      expect(metrics.errorRate).toBe(0);
      expect(metrics.p95Latency).toBe(0);
      expect(metrics.activeTenants7d).toBe(0);
      expect(metrics.activeUsers7d).toBe(0);
    });
  });

  describe('clearMetrics', () => {
    it('should delete all metric keys', async () => {
      await service.clearMetrics();

      expect(mockRedis.del).toHaveBeenCalled();
    });
  });
});
