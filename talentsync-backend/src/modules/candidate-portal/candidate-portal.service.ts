import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { S3Service } from '../../common/s3.service';
import { createHash, randomBytes } from 'crypto';
import {
  PortalCandidateDto,
  PortalInterviewDto,
  PortalDocumentDto,
  PortalUploadResponseDto,
} from './dto';

// Token expiry in days
const PORTAL_TOKEN_EXPIRY_DAYS = 30;

export interface PortalContext {
  tenantId: string;
  candidateId: string;
  tokenId: string;
}

@Injectable()
export class CandidatePortalService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
  ) {}

  /**
   * Generate a new portal access token for a candidate.
   * Returns the raw token (to be sent to candidate) - not stored, only hash is stored.
   */
  async generateToken(
    tenantId: string,
    candidateId: string,
  ): Promise<{ token: string; expiresAt: Date }> {
    // Verify candidate exists
    const candidate = await this.prisma.candidate.findFirst({
      where: { id: candidateId, tenantId, deletedAt: null },
    });

    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    // Generate secure random token
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(rawToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + PORTAL_TOKEN_EXPIRY_DAYS);

    // Create token record
    await this.prisma.candidatePortalToken.create({
      data: {
        tenantId,
        candidateId,
        tokenHash,
        expiresAt,
      },
    });

    return { token: rawToken, expiresAt };
  }

  /**
   * Validate a portal token and return the portal context.
   * Also updates lastUsedAt timestamp.
   */
  async validateToken(rawToken: string): Promise<PortalContext> {
    const tokenHash = this.hashToken(rawToken);

    const tokenRecord = await this.prisma.candidatePortalToken.findUnique({
      where: { tokenHash },
      include: {
        candidate: {
          select: { id: true, tenantId: true, deletedAt: true },
        },
      },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid portal token');
    }

    if (tokenRecord.revokedAt) {
      throw new UnauthorizedException('Portal token has been revoked');
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Portal token has expired');
    }

    if (tokenRecord.candidate.deletedAt) {
      throw new UnauthorizedException('Candidate no longer exists');
    }

    // Update last used timestamp (async, no await)
    this.prisma.candidatePortalToken
      .update({
        where: { id: tokenRecord.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {
        /* ignore errors on lastUsedAt update */
      });

    return {
      tenantId: tokenRecord.tenantId,
      candidateId: tokenRecord.candidateId,
      tokenId: tokenRecord.id,
    };
  }

  /**
   * Revoke a portal token
   */
  async revokeToken(tokenId: string): Promise<void> {
    await this.prisma.candidatePortalToken.update({
      where: { id: tokenId },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Revoke all portal tokens for a candidate
   */
  async revokeAllTokens(
    tenantId: string,
    candidateId: string,
  ): Promise<number> {
    const result = await this.prisma.candidatePortalToken.updateMany({
      where: { tenantId, candidateId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }

  /**
   * Get candidate profile data for portal display
   */
  async getPortalProfile(
    tenantId: string,
    candidateId: string,
  ): Promise<PortalCandidateDto> {
    const candidate = await this.prisma.candidate.findFirst({
      where: { id: candidateId, tenantId, deletedAt: null },
      include: {
        tenant: {
          select: { name: true, brandingLogoUrl: true },
        },
      },
    });

    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    return {
      id: candidate.id,
      name: candidate.name,
      email: candidate.email || undefined,
      roleTitle: candidate.roleTitle || undefined,
      stage: candidate.stage,
      photoUrl: candidate.photoUrl || undefined,
      createdAt: candidate.createdAt,
      companyName: candidate.tenant.name,
      companyLogoUrl: candidate.tenant.brandingLogoUrl || undefined,
    };
  }

  /**
   * Get upcoming interviews for a candidate
   */
  async getPortalInterviews(
    tenantId: string,
    candidateId: string,
  ): Promise<PortalInterviewDto[]> {
    const interviews = await this.prisma.interview.findMany({
      where: {
        tenantId,
        candidateId,
        deletedAt: null,
        date: { gte: new Date() }, // Only upcoming
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
      orderBy: { date: 'asc' },
      take: 10, // Limit to 10 upcoming
    });

    // Get interviewer names
    const interviewerIds = [
      ...new Set(interviews.flatMap((i) => i.interviewerIds)),
    ];
    const users = await this.prisma.user.findMany({
      where: { id: { in: interviewerIds } },
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.name || 'Interviewer']));

    return interviews.map((interview) => ({
      id: interview.id,
      date: interview.date,
      durationMins: interview.durationMins,
      stage: interview.stage,
      status: interview.status,
      meetingLink: interview.meetingLink || undefined,
      interviewerNames: interview.interviewerIds.map(
        (id) => userMap.get(id) || 'Interviewer',
      ),
    }));
  }

  /**
   * Get documents for a candidate
   */
  async getPortalDocuments(
    tenantId: string,
    candidateId: string,
  ): Promise<PortalDocumentDto[]> {
    const files = await this.prisma.fileObject.findMany({
      where: {
        tenantId,
        linkedType: 'candidate',
        linkedId: candidateId,
        status: 'active',
      },
      orderBy: { createdAt: 'desc' },
    });

    // Generate download URLs for each file
    const documentsWithUrls = await Promise.all(
      files.map(async (file) => {
        let downloadUrl: string | undefined;
        try {
          downloadUrl = await this.s3Service.getPresignedDownloadUrl(
            file.key,
            file.filename,
          );
        } catch {
          // Ignore errors generating download URLs
        }

        return {
          id: file.id,
          filename: file.filename,
          mimeType: file.mimeType || undefined,
          size: file.size || undefined,
          createdAt: file.createdAt,
          downloadUrl,
        };
      }),
    );

    return documentsWithUrls;
  }

  /**
   * Generate a pre-signed upload URL for document upload
   */
  async generateUploadUrl(
    tenantId: string,
    candidateId: string,
    filename: string,
    contentType?: string,
  ): Promise<PortalUploadResponseDto> {
    // Validate filename
    if (!filename || filename.length > 255) {
      throw new BadRequestException('Invalid filename');
    }

    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const s3Key = `tenants/${tenantId}/candidates/${candidateId}/documents/${Date.now()}_${sanitizedFilename}`;
    const mimeType = contentType || 'application/octet-stream';

    const uploadUrl = await this.s3Service.getPresignedUploadUrl(
      s3Key,
      mimeType,
    );

    // Create pending file record
    const fileRecord = await this.prisma.fileObject.create({
      data: {
        tenantId,
        linkedType: 'candidate',
        linkedId: candidateId,
        key: s3Key,
        filename: sanitizedFilename,
        status: 'pending', // Will be updated to 'active' on confirmation
      },
    });

    return {
      uploadUrl,
      fileId: fileRecord.id,
      s3Key,
    };
  }

  /**
   * Confirm a document upload (changes status from pending to active)
   */
  async confirmUpload(
    tenantId: string,
    fileId: string,
    s3Key: string,
    mimeType?: string,
    size?: number,
  ): Promise<PortalDocumentDto> {
    const file = await this.prisma.fileObject.findFirst({
      where: { id: fileId, tenantId, key: s3Key, status: 'pending' },
    });

    if (!file) {
      throw new NotFoundException('Upload not found or already confirmed');
    }

    const updated = await this.prisma.fileObject.update({
      where: { id: fileId },
      data: {
        status: 'active',
        mimeType: mimeType || file.mimeType,
        size: size || file.size,
      },
    });

    return {
      id: updated.id,
      filename: updated.filename,
      mimeType: updated.mimeType || undefined,
      size: updated.size || undefined,
      createdAt: updated.createdAt,
    };
  }

  /**
   * Hash a token for secure storage
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
