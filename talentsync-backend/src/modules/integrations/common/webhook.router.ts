import { Injectable } from '@nestjs/common';
import { IntegrationsQueue } from '../queues/integrations.queue';

@Injectable()
export class WebhookRouter {
    constructor(private queue: IntegrationsQueue) { }

    async route(provider: string, tenantId: string, payload: any) {
        // Basic verification placeholder: provider-specific verification should be implemented per provider
        await this.queue.getQueue().add('webhook', { provider, tenantId, action: 'webhook', payload });
    }
}
