import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../common/prisma.service';
import { RecycleBinService } from '../recycle-bin/recycle-bin.service';
import { invalidateCache } from '../../common/cache.util';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { ListCandidatesDto } from './dto/list-candidates.dto';
import { BulkImportDto } from './dto/bulk-import.dto';
import { StorageService } from '../storage/storage.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IntegrationEventsService } from '../integrations/services/integration-events.service';
import {
  parseSpreadsheet,
  isSupportedSpreadsheet,
} from './utils/spreadsheet-parser.util';
import { parseSearchQuery } from './utils/boolean-search.parser';

@Injectable()
export class CandidatesService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    @InjectQueue('candidate-import') private importQueue: Queue,
    private eventEmitter: EventEmitter2,
    private recycleBinService: RecycleBinService,
    private integrationEvents: IntegrationEventsService,
  ) {}

  async create(tenantId: string, userId: string, dto: CreateCandidateDto) {
    if (dto.email) {
      const existing = await this.prisma.candidate.findFirst({
        where: { tenantId, email: dto.email },
      });
      if (existing)
        throw new BadRequestException(
          'Candidate with this email already exists',
        );
    }

    const candidate = await this.prisma.candidate.create({
      data: {
        tenantId,
        createdById: userId,
        ...(dto as any),
        vendorSubmittedAt: dto.vendorId ? new Date() : null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'CANDIDATE_CREATE',
        metadata: { id: candidate.id, name: candidate.name },
      },
    });

    await invalidateCache(`reports:${tenantId}:*`);

    // Trigger integration sync (async, non-blocking)
    this.integrationEvents
      .onCandidateCreated(tenantId, candidate.id, userId)
      .catch(() => {});

    return candidate;
  }

  async update(
    tenantId: string,
    userId: string | undefined,
    id: string,
    dto: UpdateCandidateDto,
  ) {
    const candidate = await this.get(tenantId, id);

    const updated = await this.prisma.candidate.update({
      where: { id },
      data: dto,
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: userId || null,
        action: 'CANDIDATE_UPDATE',
        metadata: { id, changes: dto as any },
      },
    });

    if (dto.stage && dto.stage !== candidate.stage) {
      this.eventEmitter.emit('candidate.stage.updated', {
        tenantId,
        candidateId: id,
        stage: dto.stage,
        previousStage: candidate.stage,
      });
      // Trigger integration sync for stage change (async, non-blocking)
      this.integrationEvents
        .onCandidateStageChanged(tenantId, id, dto.stage, userId || undefined)
        .catch(() => {});
    } else {
      // Trigger integration sync for general update (async, non-blocking)
      this.integrationEvents
        .onCandidateUpdated(tenantId, id, userId || undefined)
        .catch(() => {});
    }

    await invalidateCache(`reports:${tenantId}:*`);

    return updated;
  }

  async get(tenantId: string, id: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id },
      include: {
        opportunityLinks: {
          include: {
            opportunityContext: true,
          },
        },
        externalFeedback: {
          orderBy: { interviewDate: 'desc' },
        },
      },
    });
    if (!candidate || candidate.tenantId !== tenantId) {
      throw new NotFoundException('Candidate not found');
    }
    return candidate;
  }

  async list(tenantId: string, dto: ListCandidatesDto) {
    const page = Number(dto.page) || 1;
    const perPage = Math.min(Number(dto.perPage) || 20, 10000); // Cap at 10000 for "View All"
    const where: any = {
      tenantId,
      deletedAt: null,
    };

    if (dto.stage) where.stage = { equals: dto.stage, mode: 'insensitive' };

    // Handle source filter - wildcards for CRM integrations
    if (dto.source) {
      if (dto.source === 'ZOHO_CRM') {
        // Match any Zoho source (ZOHO_LEAD, ZOHO_CONTACT, or legacy ZOHO_CRM)
        where.source = { in: ['ZOHO_CRM', 'ZOHO_LEAD', 'ZOHO_CONTACT'] };
      } else if (dto.source === 'SALESFORCE') {
        // Match any Salesforce source
        where.source = {
          in: ['SALESFORCE', 'SALESFORCE_LEAD', 'SALESFORCE_CONTACT'],
        };
      } else {
        where.source = dto.source;
      }
    }

    if (dto.role) where.roleTitle = { contains: dto.role, mode: 'insensitive' };
    if (dto.recruiterId && dto.recruiterId !== 'all')
      where.createdById = dto.recruiterId;

    if (dto.dateFrom || dto.dateTo) {
      where.createdAt = { ...where.createdAt }; // preserve existing if any
      if (dto.dateFrom) where.createdAt.gte = new Date(dto.dateFrom);
      if (dto.dateTo) where.createdAt.lte = new Date(dto.dateTo);
    }

    if (dto.q) {
      if (dto.searchMode === 'boolean') {
        // Advanced boolean search with AND, OR, NOT, quotes, field:value
        const booleanFilter = parseSearchQuery(dto.q, [
          'name',
          'email',
          'roleTitle',
          'phone',
        ]);
        if (Object.keys(booleanFilter).length > 0) {
          // Merge boolean filter with existing where clause
          if (booleanFilter.AND) {
            where.AND = [...(where.AND || []), ...booleanFilter.AND];
          } else if (booleanFilter.OR) {
            where.AND = [...(where.AND || []), { OR: booleanFilter.OR }];
          } else if (booleanFilter.NOT) {
            where.NOT = booleanFilter.NOT;
          } else {
            where.AND = [...(where.AND || []), booleanFilter];
          }
        }
      } else {
        // Simple search (default) - OR across name, email, roleTitle
        where.OR = [
          { name: { contains: dto.q, mode: 'insensitive' } },
          { email: { contains: dto.q, mode: 'insensitive' } },
          { roleTitle: { contains: dto.q, mode: 'insensitive' } },
        ];
      }
    }

    const [total, data] = await Promise.all([
      this.prisma.candidate.count({ where }),
      this.prisma.candidate.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: dto.sort ? this.parseSort(dto.sort) : { createdAt: 'asc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          stage: true,
          roleTitle: true,
          createdAt: true,
          updatedAt: true,
          source: true,
          createdById: true,
        },
      }),
    ]);

    // Skip interview enrichment for large result sets (> 100) for performance
    // The scheduling UI can fetch interview status for individual candidates when needed
    if (perPage > 100 || data.length > 100) {
      return {
        data: data.map((c) => ({ ...c, hasActiveInterview: false })),
        meta: { total, page, perPage, lastPage: Math.ceil(total / perPage) },
      };
    }

    // Enrich with hasActiveInterview flag for smaller result sets
    const candidateIds = data.map((c) => c.id);
    const now = new Date();

    const activeInterviews =
      candidateIds.length > 0
        ? await this.prisma.interview.findMany({
            where: {
              tenantId,
              candidateId: { in: candidateIds },
              status: 'SCHEDULED',
              date: { gt: now },
            },
            select: { candidateId: true, id: true, date: true },
          })
        : [];

    // Create a map for quick lookup
    const activeInterviewMap = new Map(
      activeInterviews.map((i) => [
        i.candidateId,
        { interviewId: i.id, interviewDate: i.date },
      ]),
    );

    const enrichedData = data.map((candidate) => ({
      ...candidate,
      hasActiveInterview: activeInterviewMap.has(candidate.id),
      activeInterviewId: activeInterviewMap.get(candidate.id)?.interviewId,
      activeInterviewDate: activeInterviewMap.get(candidate.id)?.interviewDate,
    }));

    return {
      data: enrichedData,
      meta: { total, page, perPage, lastPage: Math.ceil(total / perPage) },
    };
  }

  async delete(tenantId: string, userId: string, id: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id },
      include: { interviews: true }, // Include related data for full snapshot
    });

    if (!candidate || candidate.tenantId !== tenantId) {
      throw new NotFoundException('Candidate not found');
    }

    // Use new field names: module, itemId, itemSnapshot (full object)
    await this.recycleBinService.softDelete(
      tenantId,
      userId,
      'candidate',
      id,
      candidate,
    );

    await this.prisma.auditLog.create({
      data: { tenantId, userId, action: 'CANDIDATE_DELETE', metadata: { id } },
    });

    await invalidateCache(`reports:${tenantId}:*`);

    return { success: true };
  }

  /**
   * NEW: Generate resume upload URL using StorageService
   * This replaces the old direct S3 upload method
   */
  async generateResumeUploadUrl(
    tenantId: string,
    userId: string,
    candidateId: string,
    filename: string,
  ) {
    await this.get(tenantId, candidateId);

    // Use StorageService to generate upload URL with FileObject tracking
    const result = await this.storageService.generateUploadUrl(
      tenantId,
      userId,
      {
        filename,
        linkedType: 'candidate',
        linkedId: candidateId,
      },
    );

    return result;
  }

  /**
   * NEW: Attach resume using StorageService
   * This confirms the upload and triggers scanning/text extraction
   */
  async attachResume(
    tenantId: string,
    userId: string,
    candidateId: string,
    fileId: string,
    s3Key: string,
    mimeType?: string,
    size?: number,
  ) {
    await this.get(tenantId, candidateId);

    // Attach file via StorageService (triggers scanning & text extraction)
    await this.storageService.attachFile(tenantId, userId, {
      fileId,
      s3Key,
      mimeType,
      size,
    });

    // Backward compatibility: Update candidate.resumeUrl
    await this.prisma.candidate.update({
      where: { id: candidateId },
      data: { resumeUrl: s3Key },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'CANDIDATE_RESUME_ATTACH',
        metadata: { candidateId, fileId, s3Key },
      },
    });

    return { success: true, fileId };
  }

  /**
   * Generate photo upload URL using StorageService
   */
  async generatePhotoUploadUrl(
    tenantId: string,
    userId: string,
    candidateId: string,
    filename: string,
  ) {
    await this.get(tenantId, candidateId);

    // Use StorageService to generate upload URL with FileObject tracking
    const result = await this.storageService.generateUploadUrl(
      tenantId,
      userId,
      {
        filename,
        linkedType: 'candidate',
        linkedId: candidateId,
      },
    );

    return result;
  }

  /**
   * Attach photo to candidate profile
   */
  async attachPhoto(
    tenantId: string,
    userId: string,
    candidateId: string,
    fileId: string,
    s3Key: string,
  ) {
    await this.get(tenantId, candidateId);

    // Attach file via StorageService
    await this.storageService.attachFile(tenantId, userId, {
      fileId,
      s3Key,
      mimeType: 'image/jpeg', // Photos are typically JPEG
    });

    // Update candidate.photoUrl
    await this.prisma.candidate.update({
      where: { id: candidateId },
      data: { photoUrl: s3Key },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'CANDIDATE_PHOTO_ATTACH',
        metadata: { candidateId, fileId, s3Key },
      },
    });

    return { success: true, fileId, photoUrl: s3Key };
  }

  async bulkImport(tenantId: string, userId: string, dto: BulkImportDto) {
    await this.importQueue.add('import', {
      tenantId,
      userId,
      url: dto.url,
      mode: dto.mode,
    });
    return { message: 'Import job enqueued' };
  }

  /**
   * Direct bulk import - accepts parsed CSV rows from frontend
   */
  async directBulkImport(
    tenantId: string,
    userId: string,
    rows: Array<{
      name: string;
      email?: string;
      phone?: string;
      roleTitle?: string;
      source?: string;
      stage?: string;
      tags?: string;
      notes?: string;
      resumeUrl?: string;
    }>,
  ) {
    const result = {
      success: 0,
      failed: 0,
      duplicates: [] as string[],
      errors: [] as Array<{ row: number; message: string }>,
    };

    // Fetch valid hiring stages for this tenant once
    const validStages = await this.prisma.hiringStage.findMany({
      where: { tenantId, isActive: true },
      select: { key: true, name: true },
    });

    // Create a map for quick lookup (both by key and by name, case-insensitive)
    const stageMap = new Map<string, string>();
    for (const stage of validStages) {
      stageMap.set(stage.key.toLowerCase(), stage.key);
      stageMap.set(stage.name.toLowerCase(), stage.key);
      // Also handle common variations
      stageMap.set(stage.key.toLowerCase().replace(/-/g, '_'), stage.key);
      stageMap.set(stage.key.toLowerCase().replace(/_/g, '-'), stage.key);
      stageMap.set(stage.name.toLowerCase().replace(/ /g, '-'), stage.key);
      stageMap.set(stage.name.toLowerCase().replace(/ /g, '_'), stage.key);
    }

    // Helper to normalize stage from Excel to valid hiring stage key
    const normalizeStage = (inputStage?: string): string => {
      if (!inputStage) return 'APPLIED';

      const normalized = inputStage.trim().toLowerCase();

      // Try direct lookup
      if (stageMap.has(normalized)) {
        return stageMap.get(normalized)!;
      }

      // Try with hyphens replaced by underscores and vice versa
      const withUnderscores = normalized.replace(/-/g, '_');
      if (stageMap.has(withUnderscores)) {
        return stageMap.get(withUnderscores)!;
      }

      const withHyphens = normalized.replace(/_/g, '-');
      if (stageMap.has(withHyphens)) {
        return stageMap.get(withHyphens)!;
      }

      // Default to APPLIED if no match
      return 'APPLIED';
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      if (!row.name) {
        result.errors.push({ row: i + 1, message: 'Name is required' });
        result.failed++;
        continue;
      }

      try {
        // Check for duplicates by email first
        if (row.email) {
          const existing = await this.prisma.candidate.findFirst({
            where: { tenantId, email: row.email },
          });
          if (existing) {
            result.duplicates.push(row.email);
            continue;
          }
        }

        // Fallback: Check for duplicates by phone if no email
        if (!row.email && row.phone) {
          const existing = await this.prisma.candidate.findFirst({
            where: { tenantId, phone: row.phone },
          });
          if (existing) {
            result.duplicates.push(row.phone);
            continue;
          }
        }

        // Fallback: Check for duplicates by name+phone if both provided but no email
        if (!row.email && row.phone && row.name) {
          const existing = await this.prisma.candidate.findFirst({
            where: { tenantId, name: row.name, phone: row.phone },
          });
          if (existing) {
            result.duplicates.push(`${row.name} (${row.phone})`);
            continue;
          }
        }

        // Parse tags if provided as comma-separated string
        const tags = row.tags
          ? row.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [];

        // Normalize stage from Excel to match hiring stage keys
        const normalizedStage = normalizeStage(row.stage);

        await this.prisma.candidate.create({
          data: {
            tenantId,
            createdById: userId,
            name: row.name,
            email: row.email || null,
            phone: row.phone || null,
            roleTitle: row.roleTitle || null,
            source: row.source || null,
            stage: normalizedStage,
            tags,
            notes: row.notes || null,
            resumeUrl: row.resumeUrl || null,
          },
        });

        result.success++;
      } catch (error: any) {
        result.errors.push({
          row: i + 1,
          message: error.message || 'Unknown error',
        });
        result.failed++;
      }
    }

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'CANDIDATE_BULK_IMPORT',
        metadata: {
          success: result.success,
          failed: result.failed,
          duplicates: result.duplicates.length,
        },
      },
    });

    return result;
  }

  /**
   * Import candidates from an uploaded spreadsheet file (CSV or XLSX)
   * Fetches the file from S3, parses it, and imports candidates
   */
  async importFromFile(
    tenantId: string,
    userId: string,
    fileId: string,
  ): Promise<{
    success: number;
    failed: number;
    duplicates: string[];
    errors: Array<{ row: number; message: string }>;
    totalRows: number;
  }> {
    // Get file metadata from storage
    const file = await this.prisma.fileObject.findFirst({
      where: { id: fileId, tenantId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Validate file type
    const mimeType = file.mimeType || 'application/octet-stream';
    if (!isSupportedSpreadsheet(mimeType)) {
      throw new BadRequestException(
        `Unsupported file type: ${mimeType}. Please upload a CSV or Excel file.`,
      );
    }

    // Fetch file from S3
    const buffer = await this.storageService.downloadFile(file.key);

    // Parse the spreadsheet
    let rows;
    try {
      rows = parseSpreadsheet(buffer, mimeType);
    } catch (error: any) {
      throw new BadRequestException(`Failed to parse file: ${error.message}`);
    }

    if (rows.length === 0) {
      throw new BadRequestException('File contains no valid candidate rows');
    }

    // Use the existing directBulkImport logic
    const result = await this.directBulkImport(tenantId, userId, rows);

    return {
      ...result,
      totalRows: rows.length,
    };
  }

  // =====================================================
  // CANDIDATE DOCUMENTS
  // =====================================================

  /**
   * List all documents attached to a candidate
   * Uses FileObject with linkedType='candidate'
   */
  async listDocuments(tenantId: string, candidateId: string) {
    await this.get(tenantId, candidateId); // Validate candidate exists

    const files = await this.prisma.fileObject.findMany({
      where: {
        tenantId,
        linkedType: 'candidate',
        linkedId: candidateId,
        status: 'active',
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        size: true,
        createdAt: true,
        updatedAt: true,
        metadata: true,
      },
    });

    return { data: files };
  }

  // =====================================================
  // CANDIDATE NOTES
  // =====================================================

  /**
   * List all notes for a candidate with author details (paginated)
   */
  async listNotes(
    tenantId: string,
    candidateId: string,
    page = 1,
    perPage = 20,
  ) {
    await this.get(tenantId, candidateId); // Validate candidate exists

    const skip = (page - 1) * perPage;
    const [notes, total] = await Promise.all([
      this.prisma.candidateNote.findMany({
        where: { tenantId, candidateId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage,
      }),
      this.prisma.candidateNote.count({ where: { tenantId, candidateId } }),
    ]);

    // Batch fetch authors to avoid N+1
    const authorIds = [...new Set(notes.map((n) => n.authorId))];
    const authors =
      authorIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: authorIds } },
            select: { id: true, name: true, email: true },
          })
        : [];
    const authorMap = new Map(authors.map((a) => [a.id, a]));

    const enrichedNotes = notes.map((note) => ({
      ...note,
      author: authorMap.get(note.authorId) || {
        id: note.authorId,
        name: 'Unknown',
        email: '',
      },
    }));

    return {
      data: enrichedNotes,
      meta: { total, page, perPage, totalPages: Math.ceil(total / perPage) },
    };
  }

  /**
   * Sanitize HTML to prevent XSS
   */
  private sanitizeContent(content: string): string {
    return content
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Add a note to a candidate
   */
  async addNote(
    tenantId: string,
    candidateId: string,
    userId: string,
    content: string,
  ) {
    await this.get(tenantId, candidateId); // Validate candidate exists

    const sanitizedContent = this.sanitizeContent(content);

    const note = await this.prisma.candidateNote.create({
      data: {
        tenantId,
        candidateId,
        authorId: userId,
        content: sanitizedContent,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'CANDIDATE_NOTE_ADD',
        metadata: { candidateId, noteId: note.id },
      },
    });

    // Fetch author details
    const author = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    return {
      ...note,
      author: author || { id: userId, name: 'Unknown', email: '' },
    };
  }

  /**
   * Update a candidate note (author or ADMIN can update)
   */
  async updateNote(
    tenantId: string,
    noteId: string,
    userId: string,
    userRole: string,
    content: string,
  ) {
    const note = await this.prisma.candidateNote.findUnique({
      where: { id: noteId },
    });

    if (!note || note.tenantId !== tenantId) {
      throw new NotFoundException('Note not found');
    }

    // Allow author or ADMIN to update
    if (note.authorId !== userId && userRole !== 'ADMIN') {
      throw new BadRequestException(
        'Only the author or an admin can update this note',
      );
    }

    const sanitizedContent = this.sanitizeContent(content);
    const updated = await this.prisma.candidateNote.update({
      where: { id: noteId },
      data: { content: sanitizedContent },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'CANDIDATE_NOTE_UPDATE',
        metadata: { noteId },
      },
    });

    return updated;
  }

  /**
   * Delete a candidate note (author or ADMIN can delete)
   */
  async deleteNote(
    tenantId: string,
    noteId: string,
    userId: string,
    userRole: string,
  ) {
    const note = await this.prisma.candidateNote.findUnique({
      where: { id: noteId },
    });

    if (!note || note.tenantId !== tenantId) {
      throw new NotFoundException('Note not found');
    }

    // Allow author or ADMIN to delete
    if (note.authorId !== userId && userRole !== 'ADMIN') {
      throw new BadRequestException(
        'Only the author or an admin can delete this note',
      );
    }

    await this.prisma.candidateNote.delete({ where: { id: noteId } });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'CANDIDATE_NOTE_DELETE',
        metadata: { noteId, candidateId: note.candidateId },
      },
    });

    return { success: true };
  }

  // =====================================================
  // RESUME PARSING
  // =====================================================

  /**
   * Log resume parse action for audit
   */
  async logResumeParseAction(
    tenantId: string,
    userId: string,
    fileId: string,
    status: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'RESUME_PARSE',
        metadata: { fileId, status },
      },
    });
  }

  /**
   * Log bulk resume parse action for audit
   */
  async logBulkResumeParseAction(
    tenantId: string,
    userId: string,
    fileIds: string[],
    summary: {
      total: number;
      parsed: number;
      partiallyParsed: number;
      unparsable: number;
    },
  ) {
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'RESUME_PARSE_BULK',
        metadata: { fileIds, summary },
      },
    });
  }

  /**
   * Create candidate from parsed resume data (review-then-save flow)
   */
  async createFromResume(
    tenantId: string,
    userId: string,
    dto: {
      fileId: string;
      name: string;
      email?: string;
      phone?: string;
      skills?: string[];
      roleTitle?: string;
      stage?: string;
    },
  ) {
    // Validate file exists
    const file = await this.prisma.fileObject.findFirst({
      where: { id: dto.fileId, tenantId, deletedAt: null },
    });

    if (!file) {
      throw new NotFoundException('Resume file not found');
    }

    // Check for existing candidate with same email
    if (dto.email) {
      const existing = await this.prisma.candidate.findFirst({
        where: { tenantId, email: dto.email },
      });
      if (existing) {
        throw new BadRequestException(
          'Candidate with this email already exists',
        );
      }
    }

    // Create candidate
    const candidate = await this.prisma.candidate.create({
      data: {
        tenantId,
        createdById: userId,
        name: dto.name,
        email: dto.email || null,
        phone: dto.phone || null,
        roleTitle: dto.roleTitle || null,
        stage: dto.stage || 'APPLIED',
        tags: dto.skills || [],
        resumeUrl: file.key,
      },
    });

    // Link file to candidate
    await this.prisma.fileObject.update({
      where: { id: dto.fileId },
      data: {
        linkedType: 'candidate',
        linkedId: candidate.id,
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'CANDIDATE_CREATE_FROM_RESUME',
        metadata: {
          candidateId: candidate.id,
          fileId: dto.fileId,
          extractedFields: {
            name: dto.name,
            email: dto.email,
            phone: dto.phone,
            skills: dto.skills,
          },
        },
      },
    });

    await invalidateCache(`reports:${tenantId}:*`);

    return candidate;
  }

  private parseSort(sort: string) {
    const [field, dir] = sort.split(':');
    return { [field]: dir };
  }
}
