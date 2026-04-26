import { Test, TestingModule } from '@nestjs/testing';
import { AdminConsoleService } from '../admin-console.service';
import { PrismaService } from '../../../common/prisma.service';

const mockPrisma = {
    user: {
        findUnique: jest.fn(),
        create: jest.fn(),
    },
    tenant: {
        create: jest.fn(),
        findMany: jest.fn(),
    },
    auditLog: {
        create: jest.fn(),
        findMany: jest.fn(),
    }
};

const mockQueue = {
    add: jest.fn(),
};

// Mock BullMQ Queue constructor
jest.mock('bullmq', () => {
    return {
        Queue: jest.fn().mockImplementation(() => mockQueue)
    }
});

describe('AdminConsoleService', () => {
    let service: AdminConsoleService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AdminConsoleService,
                { provide: PrismaService, useValue: mockPrisma },
            ],
        }).compile();

        service = module.get<AdminConsoleService>(AdminConsoleService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createPlatformUser', () => {
        it('should create a user with hashed password', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);
            mockPrisma.user.create.mockResolvedValue({ id: 'u1', email: 'admin@platform.com' });

            // Mock bcrypt
            jest.spyOn(require('bcrypt'), 'hash').mockResolvedValue('hashed');

            const result = await service.createPlatformUser({ email: 'admin@platform.com', name: 'Admin', role: 'SUPERADMIN' }, 'me');
            expect(mockPrisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ email: 'admin@platform.com', password: 'hashed' })
            }));
            expect(result.id).toBe('u1');
        });
    });

    describe('provisionTenant', () => {
        it('should create tenant and enqueue job', async () => {
            mockPrisma.tenant.create.mockResolvedValue({ id: 't1', name: 'Acme' });

            const result = await service.provisionTenant({ name: 'Acme', domain: 'acme.com' }, 'me');

            expect(mockPrisma.tenant.create).toHaveBeenCalled();
            expect(mockQueue.add).toHaveBeenCalledWith('provision-tenant', expect.objectContaining({
                tenantId: 't1',
                name: 'Acme'
            }));
            expect(result).toEqual({ tenantId: 't1', status: 'enqueued' });
        });
    });
});
