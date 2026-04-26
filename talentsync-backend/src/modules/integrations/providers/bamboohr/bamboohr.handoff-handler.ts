import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma.service';
import { BambooHRApiService } from './bamboohr.api';
import { SyncLogService } from '../../services/sync-log.service';

/**
 * BambooHR Handoff Handler
 *
 * Handles one-way employee creation in BambooHR when:
 * 1. Candidate is marked as "Hired"
 * 2. Offer is accepted
 *
 * This is NOT a sync - it's a handoff. No updates after creation.
 */
@Injectable()
export class BambooHRHandoffHandler {
  private readonly logger = new Logger(BambooHRHandoffHandler.name);

  constructor(
    private prisma: PrismaService,
    private apiService: BambooHRApiService,
    private syncLogService: SyncLogService,
  ) {}

  /**
   * Handle candidate hired event - create employee in BambooHR
   */
  async handleCandidateHired(
    tenantId: string,
    candidateId: string,
    options?: {
      hireDate?: Date;
      department?: string;
      triggerSource?: 'MANUAL' | 'OFFER_ACCEPTED';
    },
  ): Promise<{ success: boolean; employeeId?: string; error?: string }> {
    const log = await this.syncLogService.createLog({
      tenantId,
      provider: 'bamboohr',
      eventType: 'EMPLOYEE_CREATED',
      direction: 'OUTBOUND',
      entityType: 'CANDIDATE',
      entityId: candidateId,
      payload: { triggerSource: options?.triggerSource || 'MANUAL' },
    });

    try {
      await this.syncLogService.markInProgress(log.id);

      // Check if BambooHR integration is enabled and employee creation is on
      const integration = await this.prisma.integration.findUnique({
        where: { tenantId_provider: { tenantId, provider: 'bamboohr' } },
      });

      if (!integration || integration.status !== 'connected') {
        await this.syncLogService.markSuccess(log.id, {
          skipped: true,
          reason: 'Not connected',
        });
        return { success: true }; // Not an error, just not enabled
      }

      // Check if employee creation is enabled in settings (defaults to true when connected)
      const settings = (integration.settings as any) || {};
      if (settings.enableEmployeeCreation === false) {
        await this.syncLogService.markSuccess(log.id, {
          skipped: true,
          reason: 'Employee creation disabled',
        });
        return { success: true };
      }

      // Check if already created (prevent duplicates)
      const existingMapping = await this.prisma.integrationMapping.findUnique({
        where: {
          tenantId_provider_entityType_entityId: {
            tenantId,
            provider: 'bamboohr',
            entityType: 'employee',
            entityId: candidateId,
          },
        },
      });

      if (existingMapping) {
        this.logger.log(
          `Employee already created for candidate ${candidateId}`,
        );
        await this.syncLogService.markSuccess(log.id, {
          skipped: true,
          existingEmployeeId: existingMapping.externalId,
        });
        return { success: true, employeeId: existingMapping.externalId };
      }

      // Get candidate data
      const candidate = await this.prisma.candidate.findUnique({
        where: { id: candidateId },
      });

      if (!candidate) {
        throw new Error('Candidate not found');
      }

      // Split name into first/last
      const nameParts = (candidate.name || '').trim().split(' ');
      const firstName = nameParts[0] || 'Unknown';
      const lastName = nameParts.slice(1).join(' ') || 'Unknown';

      // Format hire date
      const hireDate = options?.hireDate
        ? options.hireDate.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      // Create employee in BambooHR
      const result = await this.apiService.createEmployee(tenantId, {
        firstName,
        lastName,
        workEmail: candidate.email || undefined,
        mobilePhone: candidate.phone || undefined,
        jobTitle: candidate.roleTitle || undefined,
        department: options?.department,
        hireDate,
        externalReference: candidate.id,
      });

      // Store mapping to prevent duplicates
      await this.prisma.integrationMapping.create({
        data: {
          tenantId,
          provider: 'bamboohr',
          entityType: 'employee',
          entityId: candidateId,
          externalId: result.id,
        },
      });

      // Mark candidate as archived/hired
      await this.prisma.candidate.update({
        where: { id: candidateId },
        data: {
          stage: 'hired',
          // Could add archivedAt field if needed
        },
      });

      // Upload photo if available (photoUrl field added in migration)
      const candidateWithPhoto = candidate as typeof candidate & {
        photoUrl?: string;
      };
      if (candidateWithPhoto.photoUrl) {
        try {
          // Fetch photo from MinIO storage
          const photoFile = await this.prisma.fileObject.findFirst({
            where: { key: candidateWithPhoto.photoUrl },
          });
          if (photoFile) {
            // For now, log that photo exists - actual upload requires fetching from S3
            this.logger.log(
              `Photo available for ${candidateId}: ${candidateWithPhoto.photoUrl}`,
            );
            // Note: Full implementation would fetch from S3 and upload to BambooHR
            // await this.apiService.uploadEmployeePhoto(tenantId, result.id, photoBuffer, filename, mimeType);
          }
        } catch (photoError) {
          // Photo upload failure shouldn't fail the whole handoff
          this.logger.warn(
            `Failed to upload photo for employee ${result.id}: ${photoError}`,
          );
        }
      }

      await this.syncLogService.markSuccess(
        log.id,
        { employeeId: result.id },
        result.id,
      );
      this.logger.log(
        `Created BambooHR employee ${result.id} for candidate ${candidateId}`,
      );

      return { success: true, employeeId: result.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.syncLogService.markFailed(log.id, message, 0);
      this.logger.error(
        `Failed to create employee for ${candidateId}: ${message}`,
      );
      return { success: false, error: message };
    }
  }

  /**
   * Handle offer accepted event
   */
  async handleOfferAccepted(
    tenantId: string,
    candidateId: string,
    offerDetails?: {
      startDate?: Date;
      department?: string;
    },
  ): Promise<{ success: boolean; employeeId?: string; error?: string }> {
    return this.handleCandidateHired(tenantId, candidateId, {
      hireDate: offerDetails?.startDate,
      department: offerDetails?.department,
      triggerSource: 'OFFER_ACCEPTED',
    });
  }
}
