import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { encryptToken, decryptToken } from './token-encryption.util';

@Injectable()
export class TokenStoreService {
    constructor(private prisma: PrismaService) { }

    async saveTokens(tenantId: string, provider: string, tokens: any) {
        // encrypt sensitive fields before storing
        const toStore = { ...tokens };
        if (toStore.access_token) toStore.access_token = encryptToken(toStore.access_token);
        if (toStore.refresh_token) toStore.refresh_token = encryptToken(toStore.refresh_token);

        // upsert integration row
        await this.prisma.integration.upsert({
            where: { tenantId_provider: { tenantId, provider } },
            create: { tenantId, provider, tokens: toStore, status: 'active' },
            update: { tokens: toStore, status: 'active' }
        });
    }

    async getDecryptedToken(tenantId: string, provider: string) {
        const integ = await this.prisma.integration.findFirst({ where: { tenantId, provider } });
        if (!integ || !integ.tokens) throw new BadRequestException('Integration not configured');
        const tokens = (integ.tokens ? { ...integ.tokens as object } : {}) as any;
        if (tokens.access_token) tokens.access_token = decryptToken(tokens.access_token);
        if (tokens.refresh_token) tokens.refresh_token = decryptToken(tokens.refresh_token);
        return tokens;
    }
}
