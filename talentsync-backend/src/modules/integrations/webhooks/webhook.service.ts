import { Injectable } from '@nestjs/common';
import { IntegrationsService } from '../integrations.service';

@Injectable()
export class WebhookService {
  constructor(private integrationsService: IntegrationsService) {}

  /**
   * Handle incoming webhook from any provider
   */
  async handle(provider: string, payload: any): Promise<any> {
    return this.integrationsService.handleWebhook(provider, payload);
  }
}

