import { Test, TestingModule } from '@nestjs/testing';
import { TokenStoreService } from '../../../src/modules/integrations/common/token-store.service';
import { PrismaService } from '../../../src/common/prisma.service';
import { encryptToken, decryptToken } from '../../../src/modules/integrations/common/token-encryption.util';

describe('TokenStoreService', () => {
    let service: TokenStoreService;
    let prisma: PrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TokenStoreService,
                {
                    provide: PrismaService,
                    useValue: {
                        integration: { upsert: jest.fn(), findFirst: jest.fn() }
                    }
                }
            ],
        }).compile();

        service = module.get<TokenStoreService>(TokenStoreService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    it('should encrypt tokens on save', async () => {
        const tokens = { access_token: 'secret', refresh_token: 'very-secret' };
        await service.saveTokens('tenant1', 'hubspot', tokens);

        expect(prisma.integration.upsert).toHaveBeenCalledWith(expect.objectContaining({
            create: expect.objectContaining({
                tokens: expect.objectContaining({
                    access_token: expect.any(String),
                    refresh_token: expect.any(String)
                })
            })
        }));

        // Verify it's not plain text
        const calls = (prisma.integration.upsert as jest.Mock).mock.calls[0];
        const savedTokens = calls[0].create.tokens;
        expect(savedTokens.access_token).not.toBe('secret');
        expect(savedTokens.refresh_token).not.toBe('very-secret');
    });

    it('should decrypt tokens on get', async () => {
        const encryptedAccess = encryptToken('secret');
        const encryptedRefresh = encryptToken('very-secret');

        (prisma.integration.findFirst as jest.Mock).mockResolvedValue({
            tokens: { access_token: encryptedAccess, refresh_token: encryptedRefresh }
        });

        const result = await service.getDecryptedToken('tenant1', 'hubspot');
        expect(result.access_token).toBe('secret');
        expect(result.refresh_token).toBe('very-secret');
    });
});
