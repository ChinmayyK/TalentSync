import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
    recordIntegrationEvent(provider: string, tenantId: string, event: string) {
        // placeholder: integrate with Prometheus or push to ELK
        console.log(`metric: integration.${provider}.${event} tenant=${tenantId}`);
    }
}
