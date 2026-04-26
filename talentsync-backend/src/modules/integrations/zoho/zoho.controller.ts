import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  Post,
  Body,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AuthGuard } from '../../../common/auth.guard';
import { RbacGuard } from '../../../common/rbac.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ZohoOAuthService } from './zoho.oauth.service';
import { ZohoSyncService } from './zoho.sync.service';
import { ZohoFieldMapService } from './zoho.fieldmap.service';
import { ZohoWebhookService } from './zoho.webhook.service';
import { ZohoAuthDto } from './dto/zoho-auth.dto';
import { ZohoFieldMapDto } from './dto/zoho-fieldmap.dto';
import { PrismaService } from '../../../common/prisma.service';

@Controller('api/v1/integrations/zoho')
export class ZohoController {
  private readonly logger = new Logger(ZohoController.name);

  // Rate limiting for sync: max 5 per hour per tenant
  private syncRateLimits = new Map<
    string,
    { count: number; resetAt: number }
  >();

  constructor(
    private oauth: ZohoOAuthService,
    private sync: ZohoSyncService,
    private fieldmap: ZohoFieldMapService,
    private webhook: ZohoWebhookService,
    private prisma: PrismaService,
    @InjectQueue('zoho-sync') private syncQueue: Queue,
  ) {}

  @Get('auth-url')
  @UseGuards(AuthGuard, RbacGuard)
  @Roles('ADMIN', 'MANAGER')
  getAuthUrl(@Req() req: any, @Query('redirectUri') redirectUri: string) {
    return this.oauth.getAuthUrl(req.tenantId, redirectUri);
  }

  @Post('exchange')
  @UseGuards(AuthGuard, RbacGuard)
  @Roles('ADMIN', 'MANAGER')
  exchangeCode(@Req() req: any, @Body() dto: ZohoAuthDto) {
    return this.oauth.exchangeCode(req.tenantId, dto.code, dto.redirectUri);
  }

  @Post('sync')
  @UseGuards(AuthGuard, RbacGuard)
  @Roles('ADMIN', 'MANAGER')
  async requestSync(@Req() req: any, @Body('module') module: string) {
    // Rate limiting
    const now = Date.now();
    const key = req.tenantId;
    const limit = this.syncRateLimits.get(key);
    if (limit && limit.resetAt > now) {
      if (limit.count >= 5) {
        throw new BadRequestException(
          'Rate limit exceeded: max 5 syncs per hour',
        );
      }
      limit.count++;
    } else {
      this.syncRateLimits.set(key, { count: 1, resetAt: now + 3600000 });
    }

    return this.syncQueue.add('sync-now', {
      tenantId: req.tenantId,
      module: module || 'all', // Default to full sync
      type: module ? 'single' : 'full',
    });
  }

  @Post('fieldmap')
  @UseGuards(AuthGuard, RbacGuard)
  @Roles('ADMIN', 'MANAGER')
  saveFieldMap(@Req() req: any, @Body() dto: ZohoFieldMapDto) {
    return this.fieldmap.saveMapping(req.tenantId, dto.module, dto.mapping);
  }

  /**
   * Zoho webhook endpoint
   * Note: tenantId must be validated against integration settings
   */
  @Post('webhook')
  async zohoWebhook(@Query('tenantId') tenantId: string, @Body() body: any) {
    // Validate tenantId exists and has Zoho integration
    if (!tenantId) {
      this.logger.warn('Webhook received without tenantId');
      throw new BadRequestException('Missing tenantId');
    }

    // Verify tenant exists and has active Zoho integration
    const integration = await this.prisma.integration.findFirst({
      where: {
        tenantId,
        provider: 'zoho',
        status: 'connected',
      },
    });

    if (!integration) {
      this.logger.warn(
        `Webhook received for unknown/inactive integration: ${tenantId}`,
      );
      throw new BadRequestException('Invalid or inactive integration');
    }

    // TODO: Add Zoho webhook signature verification here
    // const signature = request.headers['x-zoho-signature'];
    // if (!verifyZohoSignature(signature, body, integration.webhookSecret)) throw new BadRequestException('Invalid signature');

    return this.webhook.handleWebhook(tenantId, body);
  }
}
