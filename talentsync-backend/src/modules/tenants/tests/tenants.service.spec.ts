import { Test, TestingModule } from '@nestjs/testing';
import { TenantsService } from '../tenants.service';
import { PrismaService } from '../../../common/prisma.service';
import { Queue } from 'bullmq';

const mockPrismaService = {
    tenant: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
    },
    auditLog: {
        create: jest.fn(),
    },
    $transaction: jest.fn((promises) => Promise.all(promises)),
};

const mockQueue = {
    add: jest.fn(),
};

describe('TenantsService', () => {
    let service: TenantsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TenantsService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: 'BullQueue_domain-verification', useValue: mockQueue },
            ],
        }).compile();

        service = module.get<TenantsService>(TenantsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should create a tenant', async () => {
        const dto = { name: 'Acme', domain: 'acme.com' };
        (mockPrismaService.tenant.create as jest.Mock).mockResolvedValue({ id: '1', ...dto });

        const result = await service.create(dto, 'user1');

        expect(mockPrismaService.tenant.create).toHaveBeenCalled();
        expect(mockPrismaService.auditLog.create).toHaveBeenCalled();
        expect(result).toHaveProperty('id', '1');
    });

    it('should generate verify token', async () => {
        (mockPrismaService.tenant.findUnique as jest.Mock).mockResolvedValue({ id: '1', settings: {} });

        const result = await service.generateDomainVerificationToken('1', 'acme.com');

        expect(mockQueue.add).toHaveBeenCalled();
        expect(result).toHaveProperty('token');
    });
});
