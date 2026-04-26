export class TenantProvisionStatusDto {
    tenantId: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    message?: string;
}
