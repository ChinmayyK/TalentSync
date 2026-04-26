export abstract class IntegrationBaseService {
    abstract getAccessToken(tenantId: string): Promise<string>;
    abstract refreshToken(tenantId: string): Promise<void>;
    abstract syncLeads(tenantId: string): Promise<any>;
    abstract syncContacts(tenantId: string): Promise<any>;
}
