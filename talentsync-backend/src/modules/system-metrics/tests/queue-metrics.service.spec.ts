import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { QueueMetricsService } from '../services/queue-metrics.service';
import { COMMUNICATION_QUEUES } from '../../communication/queues';

// Mock Queue implementation
const createMockQueue = (
  jobCounts = {},
  jobs = { completed: [], failed: [] },
) => ({
  getJobCounts: jest.fn().mockResolvedValue({
    waiting: 5,
    active: 2,
    completed: 100,
    failed: 3,
    ...jobCounts,
  }),
  getJobs: jest.fn().mockImplementation((states) => {
    if (states[0] === 'completed') return Promise.resolve(jobs.completed);
    if (states[0] === 'failed') return Promise.resolve(jobs.failed);
    return Promise.resolve([]);
  }),
});

describe('QueueMetricsService', () => {
  let service: QueueMetricsService;
  let mockQueues: Record<string, any>;

  beforeEach(async () => {
    mockQueues = {
      email: createMockQueue(),
      whatsapp: createMockQueue(),
      sms: createMockQueue(),
      automation: createMockQueue(),
      scheduler: createMockQueue(),
      dlq: createMockQueue(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueMetricsService,
        {
          provide: getQueueToken(COMMUNICATION_QUEUES.EMAIL),
          useValue: mockQueues.email,
        },
        {
          provide: getQueueToken(COMMUNICATION_QUEUES.WHATSAPP),
          useValue: mockQueues.whatsapp,
        },
        {
          provide: getQueueToken(COMMUNICATION_QUEUES.SMS),
          useValue: mockQueues.sms,
        },
        {
          provide: getQueueToken(COMMUNICATION_QUEUES.AUTOMATION),
          useValue: mockQueues.automation,
        },
        {
          provide: getQueueToken(COMMUNICATION_QUEUES.SCHEDULER),
          useValue: mockQueues.scheduler,
        },
        {
          provide: getQueueToken(COMMUNICATION_QUEUES.DLQ),
          useValue: mockQueues.dlq,
        },
      ],
    }).compile();

    service = module.get<QueueMetricsService>(QueueMetricsService);
  });

  describe('getMetrics', () => {
    it('should return metrics for all queues', async () => {
      const metrics = await service.getMetrics();

      expect(metrics).toHaveLength(6);
      expect(metrics.map((m) => m.queue)).toEqual([
        'email',
        'whatsapp',
        'sms',
        'automation',
        'scheduler',
        'communication-dlq',
      ]);
    });

    it('should return correct job counts', async () => {
      const metrics = await service.getMetrics();
      const emailMetrics = metrics.find((m) => m.queue === 'email');

      expect(emailMetrics).toBeDefined();
      expect(emailMetrics?.waiting).toBe(5);
      expect(emailMetrics?.active).toBe(2);
    });

    it('should filter completed jobs to last 24h', async () => {
      const now = Date.now();
      const dayAgo = now - 24 * 60 * 60 * 1000;

      mockQueues.email.getJobs.mockImplementation((states: string[]) => {
        if (states[0] === 'completed') {
          return Promise.resolve([
            { finishedOn: now - 1000, processedOn: now - 2000 }, // within 24h
            { finishedOn: now - 1000, processedOn: now - 2000 }, // within 24h
            { finishedOn: dayAgo - 1000 }, // older than 24h
          ]);
        }
        return Promise.resolve([]);
      });

      const metrics = await service.getMetrics();
      const emailMetrics = metrics.find((m) => m.queue === 'email');

      expect(emailMetrics?.completed24h).toBe(2);
    });

    it('should handle queue errors gracefully', async () => {
      mockQueues.email.getJobCounts.mockRejectedValue(
        new Error('Queue unavailable'),
      );

      const metrics = await service.getMetrics();
      const emailMetrics = metrics.find((m) => m.queue === 'email');

      expect(emailMetrics?.waiting).toBe(0);
      expect(emailMetrics?.active).toBe(0);
    });
  });

  describe('getQueueMetrics', () => {
    it('should return metrics for a specific queue', async () => {
      const metrics = await service.getQueueMetrics('email');

      expect(metrics).toBeDefined();
      expect(metrics?.queue).toBe('email');
    });

    it('should return null for unknown queue', async () => {
      const metrics = await service.getQueueMetrics('unknown-queue');

      expect(metrics).toBeNull();
    });
  });
});
