import { Test, TestingModule } from '@nestjs/testing';
import { CommunicationMetricsService } from '../services/communication-metrics.service';
import { PrismaService } from '../../../common/prisma.service';

const mockPrisma = {
  messageLog: {
    count: jest.fn(),
    groupBy: jest.fn(),
    findMany: jest.fn(),
  },
  messageTemplate: {
    findMany: jest.fn(),
  },
};

describe('CommunicationMetricsService', () => {
  let service: CommunicationMetricsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunicationMetricsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CommunicationMetricsService>(
      CommunicationMetricsService,
    );
  });

  describe('getMetrics', () => {
    it('should return communication metrics with correct structure', async () => {
      mockPrisma.messageLog.count
        .mockResolvedValueOnce(100) // total today
        .mockResolvedValueOnce(90) // successful
        .mockResolvedValueOnce(10); // failed

      mockPrisma.messageLog.groupBy
        .mockResolvedValueOnce([
          { channel: 'EMAIL', _count: 50 },
          { channel: 'WHATSAPP', _count: 30 },
          { channel: 'SMS', _count: 20 },
        ])
        .mockResolvedValueOnce([
          { templateId: 'tpl1', _count: 25 },
          { templateId: 'tpl2', _count: 15 },
        ]);

      mockPrisma.messageLog.findMany.mockResolvedValue([
        {
          id: 'msg1',
          channel: 'EMAIL',
          status: 'FAILED',
          failedAt: new Date(),
        },
      ]);

      mockPrisma.messageTemplate.findMany.mockResolvedValue([
        { id: 'tpl1', name: 'Interview Scheduled' },
        { id: 'tpl2', name: 'Reminder' },
      ]);

      const metrics = await service.getMetrics();

      expect(metrics).toHaveProperty('messagesToday', 100);
      expect(metrics).toHaveProperty('successRate', 90);
      expect(metrics).toHaveProperty('failedCount', 10);
      expect(metrics.channelBreakdown).toEqual({
        email: 50,
        whatsapp: 30,
        sms: 20,
      });
      expect(metrics.topTemplates).toHaveLength(2);
      expect(metrics.recentFailures).toHaveLength(1);
    });

    it('should handle zero messages', async () => {
      mockPrisma.messageLog.count.mockResolvedValue(0);
      mockPrisma.messageLog.groupBy.mockResolvedValue([]);
      mockPrisma.messageLog.findMany.mockResolvedValue([]);
      mockPrisma.messageTemplate.findMany.mockResolvedValue([]);

      const metrics = await service.getMetrics();

      expect(metrics.messagesToday).toBe(0);
      expect(metrics.successRate).toBe(0);
      expect(metrics.channelBreakdown).toEqual({
        email: 0,
        whatsapp: 0,
        sms: 0,
      });
      expect(metrics.topTemplates).toEqual([]);
    });
  });
});
