import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class ZohoWebhookService {
  constructor(private prisma: PrismaService) {}

  async handleWebhook(tenantId: string, body: any) {
    // Zoho Webhook format example:
    // body = { module: "Leads", event: "edit", id: "12345", data: {...} }

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        action: 'zoho.webhook',
        metadata: body,
      },
    });

    // Optionally trigger incremental sync job:
    // queue.add('zoho-sync', { tenantId, module: body.module.toLowerCase() });
    return { success: true };
  }
}
