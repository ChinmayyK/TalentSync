import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import {
  CreateVendorDto,
  UpdateVendorDto,
  AssignJobDto,
  InviteVendorUserDto,
} from './dto/vendors.dto';
import { Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // ADMIN / TENANT METHODS
  // ============================================

  async create(tenantId: string, dto: CreateVendorDto) {
    const existing = await this.prisma.vendor.findFirst({
      where: { tenantId, email: dto.email },
    });
    if (existing)
      throw new ConflictException('Vendor with this email already exists');

    return this.prisma.vendor.create({
      data: {
        tenantId,
        ...dto,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.vendor.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { users: true, assignedJobs: true, candidates: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id, tenantId },
      include: {
        users: { select: { id: true, name: true, email: true, status: true } },
        assignedJobs: {
          include: { job: { select: { id: true, title: true, status: true } } },
        },
      },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  async update(tenantId: string, id: string, dto: UpdateVendorDto) {
    await this.findOne(tenantId, id); // Ensure exists
    return this.prisma.vendor.update({
      where: { id },
      data: dto,
    });
  }

  async delete(tenantId: string, id: string) {
    await this.findOne(tenantId, id); // Ensure exists
    return this.prisma.vendor.delete({
      where: { id },
    });
  }

  async inviteUser(
    tenantId: string,
    vendorId: string,
    dto: InviteVendorUserDto,
  ) {
    const vendor = await this.findOne(tenantId, vendorId);

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      // In a real app, we might handle multi-tenant/multi-vendor users differently
      throw new ConflictException('User with this email already exists');
    }

    // Create User with VENDOR role
    const hashedPassword = await bcrypt.hash('password123', 10); // Default password/invitation flow

    // Create new User
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: hashedPassword, // Should use invitation token in real impl
        role: Role.VENDOR,
        status: UserStatus.ACTIVE, // Or PENDING if using invites
        vendorId,
        // Legacy tenantId needed for some queries? Ideally not for global users but currently schema uses it
        tenantId, // Temporary assignment to tenant
      },
    });

    // Also create UserTenant record for access
    await this.prisma.userTenant.create({
      data: {
        userId: user.id,
        tenantId,
        role: Role.VENDOR,
        status: 'ACTIVE',
      },
    });

    // TODO: Send invitation email

    return user;
  }

  async assignJob(tenantId: string, vendorId: string, dto: AssignJobDto) {
    const { jobId, commissionType, commissionValue } = dto;

    // Verify job belongs to tenant
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, tenantId },
    });
    if (!job) throw new NotFoundException('Job not found');

    // Create assignment
    // Use upsert to update commission if already assigned
    return this.prisma.jobVendor.upsert({
      where: { jobId_vendorId: { jobId, vendorId } },
      update: {
        commissionType,
        commissionValue,
      },
      create: {
        jobId,
        vendorId,
        commissionType,
        commissionValue,
        assignedBy: 'SYSTEM', // Should be current user ID
      },
    });
  }

  async removeJob(tenantId: string, vendorId: string, jobId: string) {
    // Verify relation
    const assignment = await this.prisma.jobVendor.findUnique({
      where: { jobId_vendorId: { jobId, vendorId } },
      include: { job: true },
    });

    if (!assignment || assignment.job.tenantId !== tenantId) {
      throw new NotFoundException('Assignment not found');
    }

    return this.prisma.jobVendor.delete({
      where: { jobId_vendorId: { jobId, vendorId } },
    });
  }

  // ============================================
  // VENDOR PORTAL METHODS
  // ============================================

  async getMyJobs(vendorId: string) {
    const assignments = await this.prisma.jobVendor.findMany({
      where: { vendorId },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            department: true,
            location: true,
            locationType: true,
            salaryMin: true,
            salaryMax: true,
            salaryCurrency: true,
            employmentType: true,
            status: true,
            closingDate: true,
            createdAt: true,
            description: true, // Needed for card preview
          },
        },
      },
    });

    // Flatten structure for easier consumption
    return assignments.map((a: any) => ({
      ...a.job,
      commissionType: a.commissionType,
      commissionValue: a.commissionValue,
    }));
  }

  async getMyJob(vendorId: string, jobId: string) {
    const assignment = await this.prisma.jobVendor.findUnique({
      where: { jobId_vendorId: { jobId, vendorId } },
      include: {
        job: true, // Return full job details
      },
    });

    if (!assignment)
      throw new NotFoundException('Job not found or access denied');

    return {
      ...assignment.job,
      commissionType: assignment.commissionType,
      commissionValue: assignment.commissionValue,
    };
  }

  async getMyCandidates(vendorId: string) {
    return this.prisma.candidate.findMany({
      where: { vendorId },
      select: {
        id: true,
        name: true,
        email: true,
        stage: true,
        createdAt: true,
        vendorSubmittedAt: true,
        // jobId not directly on Candidate yet
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
