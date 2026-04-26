import { Test, TestingModule } from '@nestjs/testing';
import { FeedbackService } from '../feedback.service';
import { PrismaService } from '../../../common/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

const mockPrisma = {
  interview: { findFirst: jest.fn(), update: jest.fn() },
  feedback: { upsert: jest.fn(), aggregate: jest.fn(), findMany: jest.fn() },
  candidate: { update: jest.fn() },
  auditLog: { create: jest.fn() },
};

describe('FeedbackService', () => {
  let service: FeedbackService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();
    service = module.get<FeedbackService>(FeedbackService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should submit feedback and update aggregates', async () => {
    const dto = { interviewId: 'i1', rating: 5, comments: 'Great' };

    mockPrisma.interview.findFirst.mockResolvedValue({
      id: 'i1',
      interviewerIds: ['u1'],
      status: 'SCHEDULED', // Valid status
      candidateId: 'c1',
    });

    mockPrisma.feedback.upsert.mockResolvedValue({ id: 'f1', ...dto });
    mockPrisma.feedback.aggregate.mockResolvedValue({ _avg: { rating: 4.5 } }); // Mock aggregate result

    await service.submitFeedback('t1', 'u1', dto);

    expect(mockPrisma.feedback.upsert).toHaveBeenCalled();
    expect(mockPrisma.interview.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'i1' },
        data: expect.objectContaining({ avgRating: 4.5 }),
      }),
    );
    expect(mockPrisma.candidate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c1' },
        data: expect.objectContaining({ overallScore: 4.5 }),
      }),
    );
  });

  it('should throw if user not assigned', async () => {
    mockPrisma.interview.findFirst.mockResolvedValue({
      id: 'i1',
      interviewerIds: ['other'],
      status: 'SCHEDULED',
    });

    await expect(
      service.submitFeedback('t1', 'u1', { interviewId: 'i1', rating: 5 }),
    ).rejects.toThrow(ForbiddenException);
  });
});
