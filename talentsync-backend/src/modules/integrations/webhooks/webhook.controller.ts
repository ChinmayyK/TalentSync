import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { WebhookService } from './webhook.service';

// Allowed webhook providers
const ALLOWED_PROVIDERS = [
  'zoho',
  'google_calendar',
  'outlook_calendar',
  'slack',
  'greenhouse',
  'lever',
];

@Controller('api/v1/integrations/webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private webhookService: WebhookService) {}

  /**
   * Receive webhook events from integration providers
   * Note: Signature verification should be added per-provider
   */
  @Post(':provider')
  @HttpCode(200)
  async receiveWebhook(
    @Param('provider') provider: string,
    @Body() payload: any,
  ) {
    // Validate provider
    if (!ALLOWED_PROVIDERS.includes(provider.toLowerCase())) {
      this.logger.warn(`Rejected webhook from unknown provider: ${provider}`);
      throw new BadRequestException(`Unknown provider: ${provider}`);
    }

    // TODO: Add signature verification per provider
    // e.g., verify HMAC-SHA256 signature from X-Signature header

    return this.webhookService.handle(provider.toLowerCase(), payload);
  }
}

