import { Test, TestingModule } from '@nestjs/testing';
import { SchedulingMetricsService } from '../services/scheduling-metrics.service';
import { PrismaService } from '../../../common/prisma.service';

const mockPrisma = {
  interview: {
    count: jest.fn(),
  },
  $queryRaw: jest.fn(),
};

describe('SchedulingMetricsService', () => {
  let service: SchedulingMetricsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulingMetricsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SchedulingMetricsService>(SchedulingMetricsService);
  });

  describe('getMetrics', () => {
    it('should return scheduling metrics with correct structure', async () => {
      mockPrisma.interview.count
        .mockResolvedValueOnce(25) // interviews today
        .mockResolvedValueOnce(3); // cancelled

      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(5) }]) // rescheduled
        .mockResolvedValueOnce([{ avg_hours: 48.5 }]); // avg time to first interview

      const metrics = await service.getMetrics();

      expect(metrics).toHaveProperty('interviewsToday', 25);
      expect(metrics).toHaveProperty('cancelledToday', 3);
      expect(metrics).toHaveProperty('rescheduledToday', 5);
      expect(metrics).toHaveProperty('availabilityEngineAvgMs');
      expect(metrics).toHaveProperty('avgTimeToFirstInterviewHours', 48.5);
    });

    it('should handle zero interviews', async () => {
      mockPrisma.interview.count.mockResolvedValue(0);
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ count: BigInt(0) }])
        .mockResolvedValueOnce([{ avg_hours: 0 }]);

      const metrics = await service.getMetrics();

      expect(metrics.interviewsToday).toBe(0);
      expect(metrics.cancelledToday).toBe(0);
      expect(metrics.rescheduledToday).toBe(0);
    });
  });
});
