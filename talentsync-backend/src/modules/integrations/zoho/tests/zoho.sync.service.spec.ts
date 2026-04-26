import { Test, TestingModule } from '@nestjs/testing';
import { ZohoSyncService } from '../zoho.sync.service';
import { ZohoOAuthService } from '../zoho.oauth.service';
import { ZohoFieldMapService } from '../zoho.fieldmap.service';
import { PrismaService } from '../../../../common/prisma.service';

describe('ZohoSyncService', () => {
    let service: ZohoSyncService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ZohoSyncService,
                {
                    provide: PrismaService,
                    useValue: {
                        candidate: { upsert: jest.fn() },
                        integration: { updateMany: jest.fn() }
                    }
                },
                {
                    provide: ZohoOAuthService,
                    useValue: { getAccessToken: jest.fn().mockResolvedValue('mock-token') }
                },
                {
                    provide: ZohoFieldMapService,
                    useValue: { getMapping: jest.fn().mockResolvedValue({}) }
                }
            ],
        }).compile();

        service = module.get<ZohoSyncService>(ZohoSyncService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
