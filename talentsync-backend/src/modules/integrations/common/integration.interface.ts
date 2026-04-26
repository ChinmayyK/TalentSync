export interface IntegrationConnector {
    provider: string;
    init(tenantId: string): Promise<void>;
    getAccessToken(tenantId: string): Promise<string>;
    refreshToken(tenantId: string): Promise<void>;
    pushRecord(tenantId: string, record: any): Promise<any>;
    pullChanges(tenantId: string, since?: string): Promise<any[]>;
    handleWebhook?(tenantId: string, payload: any): Promise<any>;
}
