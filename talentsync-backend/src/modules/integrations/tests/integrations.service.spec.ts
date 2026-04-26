import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationsService } from '../integrations.service';
import { PrismaService } from '../../../common/prisma.service';
import { ProviderFactory } from '../provider.factory';
import { AuditService } from '../../audit/audit.service';
import { ZohoApiService } from '../providers/zoho/zoho.api';
import { Queue } from 'bullmq';

describe('IntegrationsService', () => {
    let service: IntegrationsService;
    let prisma: PrismaService;
    let providerFactory: ProviderFactory;

    const mockPrismaService = {
        integration: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            upsert: jest.fn(),
        },
    };

    const mockProviderFactory = {
        isSupported: jest.fn(),
        getProvider: jest.fn(),
    };

    const mockAuditService = {
        log: jest.fn(),
    };

    const mockZohoApiService = {
        getLeads: jest.fn(),
        createLead: jest.fn(),
        getDeals: jest.fn(),
    };

    const mockQueue = {
        add: jest.fn(),
    } as unknown as Queue;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                IntegrationsService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
                {
                    provide: ProviderFactory,
                    useValue: mockProviderFactory,
                },
                {
                    provide: AuditService,
                    useValue: mockAuditService,
                },
                {
                    provide: ZohoApiService,
                    useValue: mockZohoApiService,
                },
                {
                    provide: 'BullQueue_integration-sync',
                    useValue: mockQueue,
                },
            ],
        }).compile();

        service = module.get<IntegrationsService>(IntegrationsService);
        prisma = module.get<PrismaService>(PrismaService);
        providerFactory = module.get<ProviderFactory>(ProviderFactory);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('connect', () => {
        it('should return auth URL for supported provider', async () => {
            const tenantId = 'tenant-123';
            const provider = 'zoho';
            const userId = 'user-123';
            const authUrl = 'https://accounts.zoho.com/oauth/v2/auth?...';

            mockProviderFactory.isSupported.mockReturnValue(true);
            mockProviderFactory.getProvider.mockReturnValue({
                getAuthUrl: jest.fn().mockResolvedValue(authUrl),
            });

            const result = await service.connect(tenantId, provider, userId);

            expect(result).toEqual({ authUrl, provider });
            expect(mockAuditService.log).toHaveBeenCalledWith({
                tenantId,
                userId,
                action: 'integration.connect.initiated',
                metadata: { provider },
            });
        });

        it('should throw error for unsupported provider', async () => {
            mockProviderFactory.isSupported.mockReturnValue(false);

            await expect(
                service.connect('tenant-123', 'unsupported', 'user-123'),
            ).rejects.toThrow('Provider unsupported is not supported');
        });
    });

    describe('callback', () => {
        it('should exchange code for tokens', async () => {
            const provider = 'zoho';
            const code = 'auth-code-123';
            const state = Buffer.from(
                JSON.stringify({ tenantId: 'tenant-123', timestamp: Date.now(), nonce: 'abc' }),
            ).toString('base64url');
            const userId = 'user-123';

            mockProviderFactory.isSupported.mockReturnValue(true);
            mockProviderFactory.getProvider.mockReturnValue({
                exchangeCode: jest.fn().mockResolvedValue(undefined),
            });

            const result = await service.callback(provider, code, state, userId);

            expect(result).toEqual({ success: true, provider });
            expect(mockAuditService.log).toHaveBeenCalled();
        });
    });

    describe('updateMapping', () => {
        it('should merge and update field mappings', async () => {
            const tenantId = 'tenant-123';
            const provider = 'zoho';
            const userId = 'user-123';
            const mappingDto = {
                mappings: [
                    { sourceField: 'name', targetField: 'Full_Name', transform: 'none' },
                ],
                direction: 'bidirectional',
            };

            mockPrismaService.integration.findUnique.mockResolvedValue({
                id: 'int-123',
                tenantId,
                provider,
                settings: {
                    mapping: {
                        mappings: [],
                        direction: 'bidirectional',
                    },
                },
            });

            mockPrismaService.integration.update.mockResolvedValue({});

            const result = await service.updateMapping(
                tenantId,
                provider,
                mappingDto,
                userId,
            );

            expect(result.success).toBe(true);
            expect(result.mapping.mappings).toHaveLength(1);
        });
    });
});
