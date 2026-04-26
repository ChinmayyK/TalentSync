import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ApprovalStatus } from '@prisma/client';

export interface ApprovalRequestFilters {
  tenantId: string;
  approvalStatus?: ApprovalStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApprovalActionDto {
  userId: string;
  userName?: string;
  remarks?: string;
}

@Injectable()
export class ApprovalsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get pending approval requests
   */
  async getPending(filters: ApprovalRequestFilters) {
    const {
      tenantId,
      page = 1,
      limit = 20,
      sortBy = 'submittedAt',
      sortOrder = 'desc',
    } = filters;

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.approvalRequest.findMany({
        where: {
          tenantId,
          approvalStatus: ApprovalStatus.PENDING,
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.approvalRequest.count({
        where: {
          tenantId,
          approvalStatus: ApprovalStatus.PENDING,
        },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get missed approval requests (interview date has passed but still pending)
   */
  async getMissed(filters: ApprovalRequestFilters) {
    const {
      tenantId,
      page = 1,
      limit = 20,
      sortBy = 'interviewDate',
      sortOrder = 'asc',
    } = filters;

    const skip = (page - 1) * limit;
    const now = new Date();

    const [items, total] = await Promise.all([
      this.prisma.approvalRequest.findMany({
        where: {
          tenantId,
          approvalStatus: ApprovalStatus.PENDING,
          interviewDate: { lt: now },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.approvalRequest.count({
        where: {
          tenantId,
          approvalStatus: ApprovalStatus.PENDING,
          interviewDate: { lt: now },
        },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all approval requests with filters
   */
  async getAll(filters: ApprovalRequestFilters) {
    const {
      tenantId,
      approvalStatus,
      page = 1,
      limit = 20,
      sortBy = 'submittedAt',
      sortOrder = 'desc',
    } = filters;

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };
    if (approvalStatus) {
      where.approvalStatus = approvalStatus;
    }

    const [items, total] = await Promise.all([
      this.prisma.approvalRequest.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.approvalRequest.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single approval request by ID
   */
  async getById(id: string, tenantId: string) {
    return this.prisma.approvalRequest.findFirst({
      where: { id, tenantId },
    });
  }

  /**
   * Approve a request
   */
  async approve(id: string, tenantId: string, action: ApprovalActionDto) {
    const request = await this.prisma.approvalRequest.findFirst({
      where: { id, tenantId },
    });

    if (!request) {
      throw new Error('Approval request not found');
    }

    if (request.approvalStatus !== ApprovalStatus.PENDING) {
      throw new Error('Request is not pending approval');
    }

    return this.prisma.approvalRequest.update({
      where: { id },
      data: {
        approvalStatus: ApprovalStatus.APPROVED,
        submissionStatus: 'Approved',
        approvedBy: action.userId,
        approvedAt: new Date(),
        remarks: action.remarks,
      },
    });
  }

  /**
   * Reject a request
   */
  async reject(id: string, tenantId: string, action: ApprovalActionDto) {
    const request = await this.prisma.approvalRequest.findFirst({
      where: { id, tenantId },
    });

    if (!request) {
      throw new Error('Approval request not found');
    }

    if (request.approvalStatus !== ApprovalStatus.PENDING) {
      throw new Error('Request is not pending approval');
    }

    return this.prisma.approvalRequest.update({
      where: { id },
      data: {
        approvalStatus: ApprovalStatus.REJECTED,
        submissionStatus: 'Rejected',
        rejectedBy: action.userId,
        rejectedAt: new Date(),
        remarks: action.remarks,
      },
    });
  }

  /**
   * Bulk approve requests
   */
  async bulkApprove(
    ids: string[],
    tenantId: string,
    action: ApprovalActionDto,
  ) {
    return this.prisma.approvalRequest.updateMany({
      where: {
        id: { in: ids },
        tenantId,
        approvalStatus: ApprovalStatus.PENDING,
      },
      data: {
        approvalStatus: ApprovalStatus.APPROVED,
        submissionStatus: 'Approved',
        approvedBy: action.userId,
        approvedAt: new Date(),
        remarks: action.remarks,
      },
    });
  }

  /**
   * Bulk reject requests
   */
  async bulkReject(ids: string[], tenantId: string, action: ApprovalActionDto) {
    return this.prisma.approvalRequest.updateMany({
      where: {
        id: { in: ids },
        tenantId,
        approvalStatus: ApprovalStatus.PENDING,
      },
      data: {
        approvalStatus: ApprovalStatus.REJECTED,
        submissionStatus: 'Rejected',
        rejectedBy: action.userId,
        rejectedAt: new Date(),
        remarks: action.remarks,
      },
    });
  }

  /**
   * Approve ALL pending and missed requests at once
   */
  async approveAllPendingAndMissed(
    tenantId: string,
    action: ApprovalActionDto,
  ) {
    // This approves all pending requests (which includes missed ones - pending with past date)
    const result = await this.prisma.approvalRequest.updateMany({
      where: {
        tenantId,
        approvalStatus: ApprovalStatus.PENDING,
      },
      data: {
        approvalStatus: ApprovalStatus.APPROVED,
        submissionStatus: 'Approved (Bulk)',
        approvedBy: action.userId,
        approvedAt: new Date(),
        remarks:
          action.remarks || 'Bulk approval of all pending and missed requests',
      },
    });

    return {
      count: result.count,
      message: `Successfully approved ${result.count} pending and missed requests`,
    };
  }

  /**
   * Get approval stats for dashboard
   */
  async getStats(tenantId: string) {
    const now = new Date();

    const [pending, missed, approved, rejected] = await Promise.all([
      this.prisma.approvalRequest.count({
        where: { tenantId, approvalStatus: ApprovalStatus.PENDING },
      }),
      this.prisma.approvalRequest.count({
        where: {
          tenantId,
          approvalStatus: ApprovalStatus.PENDING,
          interviewDate: { lt: now },
        },
      }),
      this.prisma.approvalRequest.count({
        where: { tenantId, approvalStatus: ApprovalStatus.APPROVED },
      }),
      this.prisma.approvalRequest.count({
        where: { tenantId, approvalStatus: ApprovalStatus.REJECTED },
      }),
    ]);

    return {
      pending,
      missed,
      approved,
      rejected,
      total: pending + approved + rejected,
    };
  }
}
