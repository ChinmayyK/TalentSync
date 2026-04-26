import { Test, TestingModule } from '@nestjs/testing';
import { CandidatesService } from './candidates.service';
import { StorageService } from '../storage/storage.service';
import { RecycleBinService } from '../recycle-bin/recycle-bin.service';
import { IntegrationEventsService } from '../integrations/services/integration-events.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getQueueToken } from '@nestjs/bullmq';
import { PrismaService } from '../../common/prisma.service';

describe('CandidatesService', () => {
  let service: CandidatesService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidatesService,
        {
          provide: PrismaService,
          useValue: {
            candidate: {
              create: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            auditLog: {
              create: jest.fn(),
            },
            fileObject: {
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            candidateNote: {
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
            user: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: StorageService,
          useValue: {
            generateUploadUrl: jest.fn(),
            attachFile: jest.fn(),
            downloadFile: jest.fn(),
          },
        },
        {
          provide: getQueueToken('candidate-import'),
          useValue: {
            add: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: RecycleBinService,
          useValue: {
            softDelete: jest.fn(),
          },
        },
        {
          provide: IntegrationEventsService,
          useValue: {
            onCandidateCreated: jest.fn().mockResolvedValue(undefined),
            onCandidateUpdated: jest.fn().mockResolvedValue(undefined),
            onCandidateStageChanged: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(CandidatesService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Add more tests as needed
});
