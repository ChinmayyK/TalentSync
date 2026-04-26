import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from '../settings.service';
import { PrismaService } from '../../../common/prisma.service';

const mockPrismaService = {
    tenant: {
        findUnique: jest.fn(),
        update: jest.fn(),
    },
    auditLog: {
        create: jest.fn(),
    },
    aPIKey: {
        create: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
    },
    $transaction: jest.fn((promises) => Promise.all(promises)),
};

describe('SettingsService', () => {
    let service: SettingsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SettingsService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<SettingsService>(SettingsService);
    });

    it('should update branding', async () => {
        (mockPrismaService.tenant.findUnique as jest.Mock).mockResolvedValue({ id: '1', settings: {} });

        await service.updateBranding('1', 'user1', { logoUrl: 'logo.png' });

        expect(mockPrismaService.tenant.update).toHaveBeenCalled();
        expect(mockPrismaService.auditLog.create).toHaveBeenCalled();
    });

    it('should create API key', async () => {
        (mockPrismaService.aPIKey.create as jest.Mock).mockResolvedValue({ id: 'k1', name: 'key1' });

        const result = await service.createApiKey('1', 'user1', { name: 'key1', scopes: [] });

        expect(result).toHaveProperty('key'); // plaintext
        expect(mockPrismaService.aPIKey.create).toHaveBeenCalled();
    });
});
