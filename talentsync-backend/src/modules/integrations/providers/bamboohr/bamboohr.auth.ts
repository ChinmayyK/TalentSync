import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma.service';
import { encryptObject, decryptObject } from '../../utils/crypto.util';

interface BambooHRCredentials {
    apiKey: string;
    subdomain: string; // Company subdomain (e.g., 'acme' for acme.bamboohr.com)
}

/**
 * BambooHR Auth Service
 * Handles API key authentication for BambooHR API
 * 
 * BambooHR API uses Basic Auth with API key as username
 * API Base: https://api.bamboohr.com/api/gateway.php/{subdomain}/v1
 */
@Injectable()
export class BambooHRAuthService {
    private readonly logger = new Logger(BambooHRAuthService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Validate and store API key
     */
    async connect(tenantId: string, apiKey: string, subdomain: string): Promise<void> {
        // Test the API key first
        const isValid = await this.validateCredentials(apiKey, subdomain);
        if (!isValid) {
            throw new Error('Invalid BambooHR credentials');
        }

        const credentials: BambooHRCredentials = { apiKey, subdomain };
        const encryptedTokens = encryptObject(credentials);

        await this.prisma.integration.upsert({
            where: {
                tenantId_provider: { tenantId, provider: 'bamboohr' },
            },
            create: {
                tenantId,
                provider: 'bamboohr',
                tokens: encryptedTokens,
                status: 'connected',
            },
            update: {
                tokens: encryptedTokens,
                status: 'connected',
                lastError: null,
            },
        });

        this.logger.log(`BambooHR connected for tenant ${tenantId}`);
    }

    /**
     * Validate credentials by making a test request
     */
    async validateCredentials(apiKey: string, subdomain: string): Promise<boolean> {
        try {
            const response = await fetch(
                `https://api.bamboohr.com/api/gateway.php/${subdomain}/v1/employees/directory`,
                {
                    headers: {
                        'Authorization': `Basic ${Buffer.from(apiKey + ':x').toString('base64')}`,
                        'Accept': 'application/json',
                    },
                }
            );
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * Get credentials for tenant
     */
    async getCredentials(tenantId: string): Promise<BambooHRCredentials> {
        const integration = await this.prisma.integration.findUnique({
            where: { tenantId_provider: { tenantId, provider: 'bamboohr' } },
        });

        if (!integration?.tokens) {
            throw new Error('BambooHR not connected');
        }

        return decryptObject<BambooHRCredentials>(integration.tokens as string);
    }

    /**
     * Check if connected
     */
    async isConnected(tenantId: string): Promise<boolean> {
        const integration = await this.prisma.integration.findUnique({
            where: { tenantId_provider: { tenantId, provider: 'bamboohr' } },
        });
        return integration?.status === 'connected' && !!integration.tokens;
    }

    /**
     * Disconnect
     */
    async disconnect(tenantId: string): Promise<void> {
        await this.prisma.integration.update({
            where: { tenantId_provider: { tenantId, provider: 'bamboohr' } },
            data: {
                status: 'disconnected',
            },
        });
    }
}
