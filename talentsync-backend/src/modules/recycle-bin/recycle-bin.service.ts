import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

// Admin roles that can see all items and purge
const ADMIN_ROLES = ['ADMIN', 'SUPERADMIN', 'SUPPORT'];

// Default retention in days - can be overridden by tenant settings or env var
const DEFAULT_RETENTION_DAYS =
  Number(process.env.RECYCLE_BIN_RETENTION_DAYS) || 30;

@Injectable()
export class RecycleBinService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get retention period in days for a tenant
   * Checks tenant settings first, then falls back to env/default
   */
  private async getRetentionDays(tenantId: string): Promise<number> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    const tenantRetention = (tenant?.settings as any)?.recycleBinRetentionDays;
    if (typeof tenantRetention === 'number' && tenantRetention > 0) {
      return tenantRetention;
    }

    return DEFAULT_RETENTION_DAYS;
  }

  /**
   * Soft delete an item - creates a recycle bin entry with full snapshot
   */
  async softDelete(
    tenantId: string,
    userId: string,
    module: string,
    itemId: string,
    itemSnapshot: any,
  ) {
    // Get configurable retention period for this tenant
    const retentionDays = await this.getRetentionDays(tenantId);

    return this.prisma.$transaction(async (tx) => {
      // Set deletedAt on the original entity based on module type
      if (module === 'candidate') {
        await tx.candidate.update({
          where: { id: itemId },
          data: { deletedAt: new Date() },
        });
      } else if (module === 'interview') {
        await tx.interview.update({
          where: { id: itemId },
          data: { deletedAt: new Date(), status: 'CANCELLED' },
        });
      }
      // Add more module types as needed

      // Create recycle bin entry with full snapshot
      return tx.recycleBinItem.create({
        data: {
          tenantId,
          module,
          itemId,
          itemSnapshot,
          deletedBy: userId,
          expiresAt: new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000),
        },
      });
    });
  }

  /**
   * List recycle bin items with role-based filtering
   */
  async findAll(
    tenantId: string,
    userId: string,
    userRole: string,
    filters?: {
      module?: string;
      from?: string;
      to?: string;
      deletedBy?: string;
      page?: number;
      perPage?: number;
    },
  ) {
    const page = filters?.page || 1;
    const perPage = Math.min(filters?.perPage || 20, 100);

    // Build where clause based on role
    const where: any = {
      tenantId,
      restoredAt: null, // Only show non-restored items
      purgedAt: null, // Only show non-purged items
    };

    // Non-admin users can only see their own deleted items
    if (!ADMIN_ROLES.includes(userRole)) {
      where.deletedBy = userId;
    } else if (filters?.deletedBy) {
      // Admins can filter by specific user
      where.deletedBy = filters.deletedBy;
    }

    // Apply module filter
    if (filters?.module) {
      where.module = filters.module;
    }

    // Apply date range filter
    if (filters?.from || filters?.to) {
      where.deletedAt = {};
      if (filters?.from) where.deletedAt.gte = new Date(filters.from);
      if (filters?.to) where.deletedAt.lte = new Date(filters.to);
    }

    const [total, data] = await Promise.all([
      this.prisma.recycleBinItem.count({ where }),
      this.prisma.recycleBinItem.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { deletedAt: 'desc' },
      }),
    ]);

    return {
      data,
      meta: { total, page, perPage, lastPage: Math.ceil(total / perPage) },
    };
  }

  /**
   * Get stats for recycle bin (counts by module)
   */
  async getStats(tenantId: string, userId: string, userRole: string) {
    const where: any = {
      tenantId,
      restoredAt: null,
      purgedAt: null,
    };

    if (!ADMIN_ROLES.includes(userRole)) {
      where.deletedBy = userId;
    }

    const items = await this.prisma.recycleBinItem.groupBy({
      by: ['module'],
      where,
      _count: { id: true },
    });

    const byModule = items.map((item) => ({
      module: item.module,
      count: item._count.id,
    }));

    const total = byModule.reduce((sum, item) => sum + item.count, 0);

    return { total, byModule };
  }

  /**
   * Get single recycle bin item with role check
   */
  async findOne(
    tenantId: string,
    userId: string,
    userRole: string,
    id: string,
  ) {
    const item = await this.prisma.recycleBinItem.findUnique({ where: { id } });

    if (!item || item.tenantId !== tenantId) {
      throw new NotFoundException('Item not found in recycle bin');
    }

    // Non-admin can only view their own items
    if (!ADMIN_ROLES.includes(userRole) && item.deletedBy !== userId) {
      throw new ForbiddenException('You can only view items you deleted');
    }

    return item;
  }

  /**
   * Restore an item from recycle bin
   */
  async restore(
    tenantId: string,
    userId: string,
    userRole: string,
    id: string,
  ) {
    const item = await this.prisma.recycleBinItem.findUnique({ where: { id } });

    if (!item || item.tenantId !== tenantId) {
      throw new NotFoundException('Item not found in recycle bin');
    }

    // Non-admin can only restore their own items
    if (!ADMIN_ROLES.includes(userRole) && item.deletedBy !== userId) {
      throw new ForbiddenException('You can only restore items you deleted');
    }

    await this.prisma.$transaction(async (tx) => {
      // Clear deletedAt on the original entity
      if (item.module === 'candidate') {
        await tx.candidate.update({
          where: { id: item.itemId },
          data: { deletedAt: null },
        });
      } else if (item.module === 'interview') {
        await tx.interview.update({
          where: { id: item.itemId },
          data: { deletedAt: null },
          // Note: Status remains as is, user can manually reschedule
        });
      }

      // Mark as restored (don't delete the bin entry for audit purposes)
      await tx.recycleBinItem.update({
        where: { id },
        data: { restoredAt: new Date() },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'RECYCLE_BIN_RESTORE',
          metadata: {
            recycleBinItemId: id,
            module: item.module,
            itemId: item.itemId,
          },
        },
      });
    });

    return { success: true, message: 'Item restored successfully' };
  }

  /**
   * Permanently purge an item (admin only)
   */
  async purge(tenantId: string, userId: string, userRole: string, id: string) {
    // Only admins can purge
    if (!ADMIN_ROLES.includes(userRole)) {
      throw new ForbiddenException(
        'Only administrators can permanently delete items',
      );
    }

    const item = await this.prisma.recycleBinItem.findUnique({ where: { id } });

    if (!item || item.tenantId !== tenantId) {
      throw new NotFoundException('Item not found in recycle bin');
    }

    await this.prisma.$transaction(async (tx) => {
      // Hard delete the original entity
      if (item.module === 'candidate') {
        await tx.candidate.delete({ where: { id: item.itemId } });
      } else if (item.module === 'interview') {
        await tx.interview.delete({ where: { id: item.itemId } });
      }

      // Mark as purged (keep record for audit)
      await tx.recycleBinItem.update({
        where: { id },
        data: { purgedAt: new Date() },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'RECYCLE_BIN_PURGE',
          metadata: {
            recycleBinItemId: id,
            module: item.module,
            itemId: item.itemId,
          },
        },
      });
    });

    return { success: true, message: 'Item permanently deleted' };
  }
}
