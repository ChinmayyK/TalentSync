import { Test, TestingModule } from '@nestjs/testing';
// Update imports for new location
import { InterviewsService } from './interviews.service';
import { PrismaService } from '../../common/prisma.service';
import { InterviewAutomationService } from './services/interview-automation.service';
import { RecycleBinService } from '../recycle-bin/recycle-bin.service';
import { IntegrationEventsService } from '../integrations/services/integration-events.service';
import { getQueueToken } from '@nestjs/bullmq';

const mockInterview = {
  id: 'i1',
  tenantId: 't1',
  candidateId: 'c1',
  interviewerIds: ['u1'],
  date: new Date(),
  durationMins: 30,
  stage: 'Scheduled',
  status: 'SCHEDULED',
  meetingLink: null,
  notes: null,
};

const mockTransactionMethods = {
  interview: {
    findFirst: jest.fn().mockResolvedValue(null), // No existing interviews
    findMany: jest.fn().mockResolvedValue([]), // No conflicts
    create: jest.fn().mockResolvedValue(mockInterview),
  },
  auditLog: { create: jest.fn().mockResolvedValue({}) },
  busyBlock: { create: jest.fn().mockResolvedValue({}) },
};

const mockPrismaService = {
  candidate: { findUnique: jest.fn() },
  user: { findMany: jest.fn() },
  interview: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  auditLog: { create: jest.fn() },
  busyBlock: { create: jest.fn() },
  $transaction: jest.fn().mockImplementation(async (callback) => {
    // Execute the callback with mock transaction methods
    return callback(mockTransactionMethods);
  }),
};

const mockQueue = { add: jest.fn() };

describe('InterviewsService', () => {
  let service: InterviewsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterviewsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: getQueueToken('interview-reminder'), useValue: mockQueue },
        { provide: getQueueToken('calendar-sync'), useValue: mockQueue },
        {
          provide: InterviewAutomationService,
          useValue: {
            onInterviewCreated: jest.fn(),
            onInterviewRescheduled: jest.fn(),
            onInterviewCancelled: jest.fn(),
            onInterviewCompleted: jest.fn(),
          },
        },
        {
          provide: RecycleBinService,
          useValue: { softDelete: jest.fn() },
        },
        {
          provide: IntegrationEventsService,
          useValue: {
            onInterviewScheduled: jest.fn().mockResolvedValue(undefined),
            onInterviewRescheduled: jest.fn().mockResolvedValue(undefined),
            onInterviewCompleted: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<InterviewsService>(InterviewsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create interview if no conflict', async () => {
    const dto = {
      candidateId: 'c1',
      interviewerIds: ['u1'],
      startAt: new Date().toISOString(),
      durationMins: 30,
    };

    mockPrismaService.candidate.findUnique.mockResolvedValue({
      id: 'c1',
      tenantId: 't1',
    });
    mockPrismaService.user.findMany.mockResolvedValue([
      { id: 'u1', tenantId: 't1' },
    ]);

    // Transaction mocks are already configured
    mockTransactionMethods.interview.findFirst.mockResolvedValue(null);
    mockTransactionMethods.interview.findMany.mockResolvedValue([]);
    mockTransactionMethods.interview.create.mockResolvedValue({
      id: 'i1',
      ...dto,
    });

    const result = await service.create('t1', 'u1', dto);
    expect(result).toHaveProperty('id', 'i1');
  });

  it('should throw conflict if candidate already has scheduled interview', async () => {
    const dto = {
      candidateId: 'c1',
      interviewerIds: ['u1'],
      startAt: '2025-01-01T10:00:00Z',
      durationMins: 60,
    };

    // Existing interview for this candidate
    const existingInterview = {
      id: 'i2',
      date: new Date('2025-01-01T10:30:00Z'),
      candidateId: 'c1',
    };

    mockPrismaService.candidate.findUnique.mockResolvedValue({
      id: 'c1',
      tenantId: 't1',
    });
    mockPrismaService.user.findMany.mockResolvedValue([
      { id: 'u1', tenantId: 't1' },
    ]);

    // Return an existing scheduled interview for this candidate
    mockTransactionMethods.interview.findFirst.mockResolvedValue(
      existingInterview,
    );

    await expect(service.create('t1', 'u1', dto)).rejects.toThrow(
      'Candidate already has a scheduled interview',
    );
  });
});

