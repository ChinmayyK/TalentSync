import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { S3Service } from '../../common/s3.service';
import { ImapService, ImapConfig } from './imap.service';
import {
  CreateResumeInboxDto,
  UpdateResumeInboxDto,
  EmailFilterDto,
  InboxEmailStatus,
} from './dto';
import { ResumeParserService } from '../candidates/services/resume-parser.service';
import * as crypto from 'crypto';

const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || 'default-encryption-key-32-bytes!';
const IV_LENGTH = 16;

@Injectable()
export class ResumeInboxService {
  private readonly logger = new Logger(ResumeInboxService.name);

  constructor(
    private prisma: PrismaService,
    private s3: S3Service,
    private imap: ImapService,
    private resumeParser: ResumeParserService,
  ) {}

  // =====================
  // Encryption helpers
  // =====================

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encrypted: string): string {
    const parts = encrypted.split(':');
    const iv = Buffer.from(parts.shift()!, 'hex');
    const encryptedText = parts.join(':');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // =====================
  // Inbox CRUD
  // =====================

  async createInbox(
    tenantId: string,
    dto: CreateResumeInboxDto,
    userId?: string,
  ) {
    // Encrypt password before storing
    const encryptedPassword = this.encrypt(dto.imapPassword);

    const inbox = await this.prisma.resumeInbox.create({
      data: {
        tenantId,
        name: dto.name,
        email: dto.email,
        imapHost: dto.imapHost,
        imapPort: dto.imapPort ?? 993,
        imapUser: dto.imapUser,
        imapPassword: encryptedPassword,
        useTls: dto.useTls ?? true,
        enabled: dto.enabled ?? true,
        pollInterval: dto.pollInterval ?? 5,
        autoProcess: dto.autoProcess ?? false,
        autoCreate: dto.autoCreate ?? false,
        defaultJobId: dto.defaultJobId,
        createdById: userId,
      },
      include: {
        defaultJob: { select: { id: true, title: true } },
      },
    });

    this.logger.log(`Created resume inbox ${inbox.id} for tenant ${tenantId}`);
    return this.sanitizeInbox(inbox);
  }

  async updateInbox(
    tenantId: string,
    inboxId: string,
    dto: UpdateResumeInboxDto,
  ) {
    const existing = await this.prisma.resumeInbox.findFirst({
      where: { id: inboxId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Inbox not found');
    }

    const updateData: any = { ...dto };

    // Only re-encrypt if password is being updated
    if (dto.imapPassword) {
      updateData.imapPassword = this.encrypt(dto.imapPassword);
    }

    const inbox = await this.prisma.resumeInbox.update({
      where: { id: inboxId },
      data: updateData,
      include: {
        defaultJob: { select: { id: true, title: true } },
      },
    });

    this.logger.log(`Updated resume inbox ${inboxId}`);
    return this.sanitizeInbox(inbox);
  }

  async deleteInbox(tenantId: string, inboxId: string) {
    const existing = await this.prisma.resumeInbox.findFirst({
      where: { id: inboxId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Inbox not found');
    }

    await this.prisma.resumeInbox.delete({
      where: { id: inboxId },
    });

    this.logger.log(`Deleted resume inbox ${inboxId}`);
    return { success: true };
  }

  async getInbox(tenantId: string, inboxId: string) {
    const inbox = await this.prisma.resumeInbox.findFirst({
      where: { id: inboxId, tenantId },
      include: {
        defaultJob: { select: { id: true, title: true } },
        _count: { select: { emails: true } },
      },
    });

    if (!inbox) {
      throw new NotFoundException('Inbox not found');
    }

    return this.sanitizeInbox(inbox);
  }

  async listInboxes(tenantId: string) {
    const inboxes = await this.prisma.resumeInbox.findMany({
      where: { tenantId },
      include: {
        defaultJob: { select: { id: true, title: true } },
        _count: { select: { emails: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return inboxes.map((inbox) => this.sanitizeInbox(inbox));
  }

  private sanitizeInbox(inbox: any) {
    // Remove encrypted password from response
    const { imapPassword, ...rest } = inbox;
    return rest;
  }

  // =====================
  // Connection testing
  // =====================

  async testConnection(tenantId: string, inboxId: string) {
    const inbox = await this.prisma.resumeInbox.findFirst({
      where: { id: inboxId, tenantId },
    });

    if (!inbox) {
      throw new NotFoundException('Inbox not found');
    }

    const config: ImapConfig = {
      host: inbox.imapHost,
      port: inbox.imapPort,
      user: inbox.imapUser,
      password: this.decrypt(inbox.imapPassword),
      secure: inbox.useTls,
    };

    return this.imap.testConnection(config);
  }

  async testConnectionWithCredentials(dto: CreateResumeInboxDto) {
    const config: ImapConfig = {
      host: dto.imapHost,
      port: dto.imapPort ?? 993,
      user: dto.imapUser,
      password: dto.imapPassword,
      secure: dto.useTls ?? true,
    };

    return this.imap.testConnection(config);
  }

  // =====================
  // Email operations
  // =====================

  async pollInbox(tenantId: string, inboxId: string) {
    const inbox = await this.prisma.resumeInbox.findFirst({
      where: { id: inboxId, tenantId },
    });

    if (!inbox) {
      throw new NotFoundException('Inbox not found');
    }

    if (!inbox.enabled) {
      throw new BadRequestException('Inbox is disabled');
    }

    const config: ImapConfig = {
      host: inbox.imapHost,
      port: inbox.imapPort,
      user: inbox.imapUser,
      password: this.decrypt(inbox.imapPassword),
      secure: inbox.useTls,
    };

    // Get existing message IDs to avoid duplicates
    const existingEmails = await this.prisma.inboxEmail.findMany({
      where: { resumeInboxId: inboxId },
      select: { messageId: true },
    });
    const existingIds = new Set(existingEmails.map((e) => e.messageId));

    // Fetch new emails since last poll
    const sinceDate = inbox.lastPolledAt || undefined;
    const emails = await this.imap.fetchNewEmails(
      config,
      sinceDate,
      existingIds,
    );

    this.logger.log(
      `Fetched ${emails.length} new emails from inbox ${inboxId}`,
    );

    // Process each email
    const results = { created: 0, skipped: 0, errors: 0 };

    for (const email of emails) {
      try {
        // Upload attachments to S3
        const attachments = [];
        for (const att of email.attachments) {
          const fileId = `inbox/${inboxId}/${Date.now()}-${att.filename}`;
          await this.s3.uploadBuffer(fileId, att.content, att.contentType);
          attachments.push({
            filename: att.filename,
            fileId,
            size: att.size,
            mimeType: att.contentType,
          });
        }

        // Determine status based on attachments
        const status =
          attachments.length > 0
            ? inbox.autoProcess
              ? 'PROCESSING'
              : 'PENDING'
            : 'NO_RESUME';

        // Create email record
        const inboxEmail = await this.prisma.inboxEmail.create({
          data: {
            tenantId,
            resumeInboxId: inboxId,
            messageId: email.messageId,
            fromAddress: email.fromAddress,
            fromName: email.fromName,
            subject: email.subject,
            bodyPreview: email.bodyPreview,
            receivedAt: email.receivedAt,
            status: status as any,
            attachments: attachments,
          },
        });

        results.created++;

        // If auto-process is enabled, queue for processing
        if (inbox.autoProcess && attachments.length > 0) {
          // Will implement queue processing later
          await this.processEmail(tenantId, inboxEmail.id);
        }
      } catch (error) {
        this.logger.error(
          `Failed to process email ${email.messageId}: ${error.message}`,
        );
        results.errors++;
      }
    }

    // Update last polled timestamp
    await this.prisma.resumeInbox.update({
      where: { id: inboxId },
      data: { lastPolledAt: new Date() },
    });

    return {
      inboxId,
      emailsFound: emails.length,
      ...results,
    };
  }

  async listEmails(tenantId: string, filter: EmailFilterDto) {
    const where: any = { tenantId };

    if (filter.inboxId) {
      where.resumeInboxId = filter.inboxId;
    }
    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.receivedAfter) {
      where.receivedAt = {
        ...where.receivedAt,
        gte: new Date(filter.receivedAfter),
      };
    }
    if (filter.receivedBefore) {
      where.receivedAt = {
        ...where.receivedAt,
        lte: new Date(filter.receivedBefore),
      };
    }
    if (filter.search) {
      where.OR = [
        { subject: { contains: filter.search, mode: 'insensitive' } },
        { fromAddress: { contains: filter.search, mode: 'insensitive' } },
        { fromName: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const skip = ((filter.page || 1) - 1) * (filter.limit || 20);

    const [emails, total] = await Promise.all([
      this.prisma.inboxEmail.findMany({
        where,
        include: {
          resumeInbox: { select: { id: true, name: true, email: true } },
          candidate: { select: { id: true, name: true, email: true } },
        },
        orderBy: { receivedAt: 'desc' },
        skip,
        take: filter.limit || 20,
      }),
      this.prisma.inboxEmail.count({ where }),
    ]);

    return {
      data: emails,
      pagination: {
        page: filter.page || 1,
        limit: filter.limit || 20,
        total,
        totalPages: Math.ceil(total / (filter.limit || 20)),
      },
    };
  }

  async getEmail(tenantId: string, emailId: string) {
    const email = await this.prisma.inboxEmail.findFirst({
      where: { id: emailId, tenantId },
      include: {
        resumeInbox: { select: { id: true, name: true, email: true } },
        candidate: true,
      },
    });

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    return email;
  }

  async processEmail(tenantId: string, emailId: string, userId?: string) {
    const email = await this.prisma.inboxEmail.findFirst({
      where: { id: emailId, tenantId },
      include: { resumeInbox: true },
    });

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    if (!['PENDING', 'FAILED'].includes(email.status)) {
      throw new BadRequestException(
        `Email cannot be processed in ${email.status} status`,
      );
    }

    // Update status to processing
    await this.prisma.inboxEmail.update({
      where: { id: emailId },
      data: { status: 'PROCESSING' },
    });

    const attachments = email.attachments as any[];
    if (attachments.length === 0) {
      await this.prisma.inboxEmail.update({
        where: { id: emailId },
        data: {
          status: 'NO_RESUME',
          processedAt: new Date(),
          processedById: userId,
        },
      });
      return { status: 'NO_RESUME', message: 'No resume attachments found' };
    }

    try {
      // Parse the first resume attachment
      const firstAttachment = attachments[0];

      // Get file from S3 and parse
      const fileStream = await this.s3.streamFile(firstAttachment.fileId);
      const fileBuffer = await this.streamToBuffer(fileStream);

      // Create a temporary file object for the parser
      const tempFileId = await this.createTempFile(
        tenantId,
        fileBuffer,
        firstAttachment.filename,
      );

      // Parse the resume
      const parsed = await this.resumeParser.parseResume(tenantId, tempFileId);

      // Update email with parsed data
      await this.prisma.inboxEmail.update({
        where: { id: emailId },
        data: {
          status: 'PARSED',
          parsedData: parsed.fields as any,
          processedAt: new Date(),
          processedById: userId,
        },
      });

      // If auto-create is enabled, create the candidate
      if (email.resumeInbox.autoCreate) {
        await this.createCandidateFromEmail(tenantId, emailId, userId);
      }

      return { status: 'PARSED', parsedData: parsed.fields };
    } catch (error) {
      this.logger.error(`Failed to process email ${emailId}: ${error.message}`);
      await this.prisma.inboxEmail.update({
        where: { id: emailId },
        data: {
          status: 'FAILED',
          error: error.message,
          processedAt: new Date(),
          processedById: userId,
        },
      });
      return { status: 'FAILED', error: error.message };
    }
  }

  async skipEmail(tenantId: string, emailId: string, userId?: string) {
    const email = await this.prisma.inboxEmail.findFirst({
      where: { id: emailId, tenantId },
    });

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    await this.prisma.inboxEmail.update({
      where: { id: emailId },
      data: {
        status: 'SKIPPED',
        processedAt: new Date(),
        processedById: userId,
      },
    });

    return { success: true };
  }

  async createCandidateFromEmail(
    tenantId: string,
    emailId: string,
    userId?: string,
  ) {
    const email = await this.prisma.inboxEmail.findFirst({
      where: { id: emailId, tenantId },
      include: { resumeInbox: true },
    });

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    if (email.status !== 'PARSED') {
      throw new BadRequestException(
        'Email must be parsed before creating candidate',
      );
    }

    if (email.candidateId) {
      throw new BadRequestException('Candidate already created for this email');
    }

    const parsedData = email.parsedData as any;
    const attachments = email.attachments as any[];
    const resumeUrl =
      attachments.length > 0
        ? await this.s3.getPresignedDownloadUrl(attachments[0].fileId)
        : undefined;

    // Create the candidate
    const candidate = await this.prisma.candidate.create({
      data: {
        tenantId,
        name: parsedData?.name || email.fromName || 'Unknown',
        email: parsedData?.email || email.fromAddress,
        phone: parsedData?.phone,
        stage: 'NEW',
        source: 'EMAIL_INBOX',
        resumeUrl,
        tags: parsedData?.skills?.slice(0, 10) || [],
        notes: `Imported from email: ${email.subject}`,
        createdById: userId,
      },
    });

    // Update email with candidate link
    await this.prisma.inboxEmail.update({
      where: { id: emailId },
      data: {
        status: 'CANDIDATE_CREATED',
        candidateId: candidate.id,
      },
    });

    this.logger.log(`Created candidate ${candidate.id} from email ${emailId}`);
    return candidate;
  }

  // =====================
  // Helpers
  // =====================

  private async streamToBuffer(stream: any): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  private async createTempFile(
    tenantId: string,
    buffer: Buffer,
    filename: string,
  ): Promise<string> {
    // Create a FileObject record for the resume parser
    const key = `temp/${tenantId}/${Date.now()}-${filename}`;
    const fileObject = await this.prisma.fileObject.create({
      data: {
        tenantId,
        filename,
        mimeType: this.getMimeType(filename),
        size: buffer.length,
        key,
      },
    });

    // Upload to S3
    await this.s3.uploadBuffer(
      key,
      buffer,
      fileObject.mimeType || 'application/octet-stream',
    );

    return fileObject.id;
  }

  private getMimeType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      rtf: 'application/rtf',
      txt: 'text/plain',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }
}
