import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class ZohoFieldMapService {
  constructor(private prisma: PrismaService) {}

  async saveMapping(tenantId: string, module: string, mapping: any) {
    const integ = await this.prisma.integration.findUnique({
      where: { tenantId_provider: { tenantId, provider: 'zoho' } },
    });

    const currentSettings = (integ?.settings as any) || {};
    const currentMapping = currentSettings.mapping || {};

    await this.prisma.integration.updateMany({
      where: { tenantId, provider: 'zoho' },
      data: {
        settings: {
          ...currentSettings,
          mapping: { ...currentMapping, [module]: mapping },
        },
      },
    });
  }

  async getMapping(tenantId: string, module: string) {
    const integ = await this.prisma.integration.findUnique({
      where: { tenantId_provider: { tenantId, provider: 'zoho' } },
    });
    const settings = integ?.settings as any;
    const mapping = settings?.mapping;
    return mapping?.[module] || null;
  }
}
