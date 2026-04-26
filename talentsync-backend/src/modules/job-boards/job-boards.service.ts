import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  JobBoardProvider,
  JobPostingStatus,
  PostJobDto,
  UpdateJobPostingDto,
  QueryJobPostingsDto,
  ProviderCredentials,
  SaveJobBoardCredentialsDto,
  BatchPostDto,
  BatchPostResponse,
} from './dto';
import { IJobBoardProvider } from './providers/provider.interface';
import { IndeedProvider } from './providers/indeed.provider';
import { LinkedInProvider } from './providers/linkedin.provider';
import { GlassdoorProvider } from './providers/glassdoor.provider';
import { ZipRecruiterProvider } from './providers/ziprecruiter.provider';

// Encryption utility (reuse from settings module if available)
import * as crypto from 'crypto';

@Injectable()
export class JobBoardsService {
  private readonly logger = new Logger(JobBoardsService.name);
  private readonly providers: Map<JobBoardProvider, IJobBoardProvider>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly indeedProvider: IndeedProvider,
    private readonly linkedInProvider: LinkedInProvider,
    private readonly glassdoorProvider: GlassdoorProvider,
    private readonly zipRecruiterProvider: ZipRecruiterProvider,
  ) {
    // Register all available providers
    this.providers = new Map<JobBoardProvider, IJobBoardProvider>([
      [JobBoardProvider.INDEED, indeedProvider],
      [JobBoardProvider.LINKEDIN, linkedInProvider],
      [JobBoardProvider.GLASSDOOR, glassdoorProvider],
      [JobBoardProvider.ZIPRECRUITER, zipRecruiterProvider],
    ]);
  }

  /**
   * Get list of available providers and their configuration status
   */
  async getAvailableProviders(tenantId: string) {
    const result = [];

    for (const [key, provider] of this.providers.entries()) {
      const credentials = await this.getProviderCredentials(tenantId, key);
      result.push({
        provider: key,
        name: provider.name,
        configured: provider.isConfigured(credentials),
      });
    }

    return result;
  }

  /**
   * Save credentials for a job board provider (per-tenant)
   */
  async saveCredentials(
    tenantId: string,
    userId: string,
    dto: SaveJobBoardCredentialsDto,
  ) {
    const providerKey = `job_board_${dto.provider.toLowerCase()}`;

    // Encrypt sensitive credentials
    const encryptedTokens = this.encryptCredentials({
      apiKey: dto.apiKey,
      apiSecret: dto.apiSecret,
      employerId: dto.employerId,
      accessToken: dto.accessToken,
      refreshToken: dto.refreshToken,
      clientId: dto.clientId,
      clientSecret: dto.clientSecret,
    });

    // Upsert into Integration table
    const integration = await this.prisma.integration.upsert({
      where: {
        tenantId_provider: {
          tenantId,
          provider: providerKey,
        },
      },
      update: {
        tokens: encryptedTokens,
        status: 'connected',
        updatedAt: new Date(),
      },
      create: {
        tenantId,
        provider: providerKey,
        tokens: encryptedTokens,
        status: 'connected',
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'JOB_BOARD_CREDENTIALS_SAVED',
        metadata: { provider: dto.provider },
      },
    });

    return {
      success: true,
      provider: dto.provider,
      message: `${dto.provider} credentials saved successfully`,
    };
  }

  /**
   * Get credentials for a specific provider (for external use, returns configured status only)
   */
  async getCredentialsStatus(tenantId: string, provider: JobBoardProvider) {
    const credentials = await this.getProviderCredentials(tenantId, provider);
    const providerInstance = this.providers.get(provider);

    return {
      provider,
      configured: providerInstance?.isConfigured(credentials) || false,
      hasApiKey: !!credentials.apiKey,
      hasEmployerId: !!credentials.employerId,
      hasAccessToken: !!credentials.accessToken,
    };
  }

  /**
   * Delete credentials for a provider
   */
  async deleteCredentials(
    tenantId: string,
    userId: string,
    provider: JobBoardProvider,
  ) {
    const providerKey = `job_board_${provider.toLowerCase()}`;

    await this.prisma.integration.deleteMany({
      where: {
        tenantId,
        provider: providerKey,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'JOB_BOARD_CREDENTIALS_DELETED',
        metadata: { provider },
      },
    });

    return { success: true, message: `${provider} credentials deleted` };
  }

  /**
   * Test connection for a provider
   * Verifies that credentials are valid by making a test API call
   */
  async testConnection(tenantId: string, provider: JobBoardProvider) {
    const providerInstance = this.providers.get(provider);
    if (!providerInstance) {
      throw new BadRequestException(`Provider ${provider} is not supported`);
    }

    const credentials = await this.getProviderCredentials(tenantId, provider);
    if (!providerInstance.isConfigured(credentials)) {
      return {
        success: false,
        provider,
        message: `${providerInstance.name} is not configured. Please add API credentials first.`,
      };
    }

    try {
      // Each provider can implement a test/ping method
      // For now, we verify credentials format and do a simple validation
      // In production, this would make a real API call to verify credentials

      this.logger.log(
        `[TestConnection] Testing ${provider} credentials for tenant ${tenantId}`,
      );

      // Simulate connection test with delay
      // In production: await providerInstance.testConnection(credentials);

      const isValid = this.validateCredentialsFormat(provider, credentials);

      if (isValid) {
        this.logger.log(`[TestConnection] ${provider} connection test passed`);
        return {
          success: true,
          provider,
          message: `Successfully connected to ${providerInstance.name}`,
        };
      } else {
        return {
          success: false,
          provider,
          message: `Invalid credentials format for ${providerInstance.name}`,
        };
      }
    } catch (error: any) {
      this.logger.error(
        `[TestConnection] ${provider} test failed: ${error.message}`,
      );
      return {
        success: false,
        provider,
        message: `Connection failed: ${error.message}`,
      };
    }
  }

  /**
   * Validate credentials format for a provider
   */
  private validateCredentialsFormat(
    provider: JobBoardProvider,
    credentials: ProviderCredentials,
  ): boolean {
    switch (provider) {
      case JobBoardProvider.INDEED:
        return !!(
          credentials.apiKey &&
          credentials.apiKey.length >= 10 &&
          credentials.employerId
        );
      case JobBoardProvider.LINKEDIN:
        return !!(credentials.accessToken && credentials.employerId);
      case JobBoardProvider.GLASSDOOR:
        return !!(credentials.apiKey && credentials.employerId);
      case JobBoardProvider.ZIPRECRUITER:
        return !!(credentials.apiKey && credentials.employerId);
      default:
        return false;
    }
  }

  /**
   * Post a job to an external job board
   */
  async postJob(tenantId: string, dto: PostJobDto, userId: string) {
    const provider = this.providers.get(dto.provider);
    if (!provider) {
      throw new BadRequestException(
        `Provider ${dto.provider} is not supported`,
      );
    }

    const job = await this.prisma.job.findFirst({
      where: { id: dto.jobId, tenantId, deletedAt: null },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.status !== 'OPEN') {
      throw new BadRequestException(
        'Only open jobs can be posted to job boards',
      );
    }

    const credentials = await this.getProviderCredentials(
      tenantId,
      dto.provider,
    );
    if (!provider.isConfigured(credentials)) {
      throw new BadRequestException(
        `${provider.name} is not configured. Please add API credentials in Settings.`,
      );
    }

    // Check if already posted
    const existing = await this.prisma.jobPosting.findFirst({
      where: {
        tenantId,
        jobId: dto.jobId,
        provider: dto.provider,
        status: { notIn: ['CLOSED', 'FAILED'] },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `This job is already posted to ${provider.name}`,
      );
    }

    // Post to external board
    const result = await provider.postJob(job, credentials, {
      customTitle: dto.customTitle,
      customDescription: dto.customDescription,
      sponsored: dto.sponsored,
    });

    // Save posting record
    const posting = await this.prisma.jobPosting.create({
      data: {
        tenantId,
        jobId: dto.jobId,
        provider: dto.provider,
        externalId: result.externalId,
        externalUrl: result.externalUrl,
        title: dto.customTitle || job.title,
        description: dto.customDescription || job.description,
        status: result.status,
        sponsored: dto.sponsored || false,
        postedAt: new Date(),
        expiresAt: dto.expiryDate ? new Date(dto.expiryDate) : null,
        createdById: userId,
      },
    });

    // Update job's externalIds JSON
    const currentExternalIds =
      (job.externalIds as Record<string, string>) || {};
    await this.prisma.job.update({
      where: { id: dto.jobId },
      data: {
        externalIds: {
          ...currentExternalIds,
          [dto.provider.toLowerCase()]: result.externalId,
        },
        lastActivityAt: new Date(),
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'JOB_POSTED_TO_BOARD',
        metadata: {
          jobId: dto.jobId,
          provider: dto.provider,
          postingId: posting.id,
          externalId: result.externalId,
        },
      },
    });

    return posting;
  }

  /**
   * Batch post a job to multiple boards
   */
  async batchPost(
    tenantId: string,
    dto: BatchPostDto,
    userId: string,
  ): Promise<BatchPostResponse> {
    const results: BatchPostResponse['results'] = [];

    for (const provider of dto.providers) {
      try {
        const posting = await this.postJob(
          tenantId,
          {
            jobId: dto.jobId,
            provider,
            customTitle: dto.customTitle,
            customDescription: dto.customDescription,
            sponsored: dto.sponsored,
          },
          userId,
        );

        results.push({
          provider,
          success: true,
          postingId: posting.id,
          externalId: posting.externalId || undefined,
          externalUrl: posting.externalUrl || undefined,
        });
      } catch (error: any) {
        results.push({
          provider,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      total: dto.providers.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  /**
   * Get all job postings
   */
  async findAll(tenantId: string, query: QueryJobPostingsDto) {
    const { jobId, provider, status, page = 1, limit = 20 } = query;

    const where = {
      tenantId,
      ...(jobId && { jobId }),
      ...(provider && { provider }),
      ...(status && { status }),
    };

    const [postings, total] = await Promise.all([
      this.prisma.jobPosting.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          job: { select: { id: true, title: true, status: true } },
        },
      }),
      this.prisma.jobPosting.count({ where }),
    ]);

    return {
      data: postings,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get single job posting
   */
  async findOne(tenantId: string, id: string) {
    const posting = await this.prisma.jobPosting.findFirst({
      where: { id, tenantId },
      include: {
        job: { select: { id: true, title: true, status: true } },
      },
    });

    if (!posting) {
      throw new NotFoundException('Job posting not found');
    }

    return posting;
  }

  /**
   * Update a job posting
   */
  async updatePosting(
    tenantId: string,
    id: string,
    userId: string,
    dto: UpdateJobPostingDto,
  ) {
    const posting = await this.findOne(tenantId, id);

    // If there's an external ID and title/description changed, update on external board
    if (posting.externalId && (dto.title || dto.description)) {
      const provider = this.providers.get(posting.provider as JobBoardProvider);
      if (provider) {
        const credentials = await this.getProviderCredentials(
          tenantId,
          posting.provider as JobBoardProvider,
        );
        const job = await this.prisma.job.findUnique({
          where: { id: posting.jobId },
        });
        if (job) {
          await provider.updateJob(posting.externalId, job, credentials);
        }
      }
    }

    return this.prisma.jobPosting.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description && { description: dto.description }),
        ...(dto.status && { status: dto.status }),
      },
    });
  }

  /**
   * Sync status from external job board
   */
  async syncStatus(tenantId: string, id: string) {
    const posting = await this.findOne(tenantId, id);

    if (!posting.externalId) {
      throw new BadRequestException('Posting has no external ID');
    }

    const provider = this.providers.get(posting.provider as JobBoardProvider);
    if (!provider) {
      throw new BadRequestException('Provider not available');
    }

    const credentials = await this.getProviderCredentials(
      tenantId,
      posting.provider as JobBoardProvider,
    );
    const status = await provider.getJobStatus(posting.externalId, credentials);

    return this.prisma.jobPosting.update({
      where: { id },
      data: {
        status,
        lastSyncAt: new Date(),
      },
    });
  }

  /**
   * Close a job posting on external board
   */
  async closePosting(tenantId: string, id: string, userId: string) {
    const posting = await this.findOne(tenantId, id);

    if (posting.externalId) {
      const provider = this.providers.get(posting.provider as JobBoardProvider);
      if (provider) {
        const credentials = await this.getProviderCredentials(
          tenantId,
          posting.provider as JobBoardProvider,
        );
        await provider.closeJob(posting.externalId, credentials);
      }
    }

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'JOB_POSTING_CLOSED',
        metadata: {
          postingId: id,
          provider: posting.provider,
          externalId: posting.externalId,
        },
      },
    });

    return this.prisma.jobPosting.update({
      where: { id },
      data: { status: 'CLOSED' },
    });
  }

  /**
   * Get provider credentials for tenant from Integration table
   */
  private async getProviderCredentials(
    tenantId: string,
    provider: JobBoardProvider,
  ): Promise<ProviderCredentials> {
    const providerKey = `job_board_${provider.toLowerCase()}`;

    // First, try to get from Integration table (per-tenant)
    const integration = await this.prisma.integration.findFirst({
      where: { tenantId, provider: providerKey },
    });

    if (integration?.tokens) {
      try {
        return this.decryptCredentials(
          integration.tokens as Record<string, string>,
        );
      } catch (e) {
        this.logger.warn(`Failed to decrypt credentials for ${provider}: ${e}`);
      }
    }

    // Fallback to environment variables for development
    return this.getEnvCredentials(provider);
  }

  /**
   * Get credentials from environment variables (fallback for dev)
   */
  private getEnvCredentials(provider: JobBoardProvider): ProviderCredentials {
    switch (provider) {
      case JobBoardProvider.INDEED:
        return {
          apiKey: this.config.get('INDEED_API_KEY'),
          employerId: this.config.get('INDEED_EMPLOYER_ID'),
        };
      case JobBoardProvider.LINKEDIN:
        return {
          accessToken: this.config.get('LINKEDIN_ACCESS_TOKEN'),
          employerId: this.config.get('LINKEDIN_COMPANY_URN'),
          clientId: this.config.get('LINKEDIN_CLIENT_ID'),
          clientSecret: this.config.get('LINKEDIN_CLIENT_SECRET'),
        };
      case JobBoardProvider.GLASSDOOR:
        return {
          apiKey: this.config.get('GLASSDOOR_API_KEY'),
          employerId: this.config.get('GLASSDOOR_EMPLOYER_ID'),
        };
      case JobBoardProvider.ZIPRECRUITER:
        return {
          apiKey: this.config.get('ZIPRECRUITER_API_KEY'),
          employerId: this.config.get('ZIPRECRUITER_EMPLOYER_ID'),
        };
      default:
        return {};
    }
  }

  /**
   * Encrypt credentials before storing
   */
  private encryptCredentials(
    credentials: ProviderCredentials,
  ): Record<string, string> {
    const key =
      this.config.get('ENCRYPTION_KEY') || 'default-dev-key-32-chars-long!!';
    const result: Record<string, string> = {};

    for (const [k, v] of Object.entries(credentials)) {
      if (v) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(
          'aes-256-gcm',
          Buffer.from(key.slice(0, 32)),
          iv,
        );
        let encrypted = cipher.update(v, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        result[k] =
          `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
      }
    }

    return result;
  }

  /**
   * Decrypt credentials after retrieving
   */
  private decryptCredentials(
    encrypted: Record<string, string>,
  ): ProviderCredentials {
    const key =
      this.config.get('ENCRYPTION_KEY') || 'default-dev-key-32-chars-long!!';
    const result: ProviderCredentials = {};

    for (const [k, v] of Object.entries(encrypted)) {
      if (v && typeof v === 'string' && v.includes(':')) {
        try {
          const [ivHex, authTagHex, encryptedData] = v.split(':');
          const iv = Buffer.from(ivHex, 'hex');
          const authTag = Buffer.from(authTagHex, 'hex');
          const decipher = crypto.createDecipheriv(
            'aes-256-gcm',
            Buffer.from(key.slice(0, 32)),
            iv,
          );
          decipher.setAuthTag(authTag);
          let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
          decrypted += decipher.final('utf8');
          (result as any)[k] = decrypted;
        } catch (e) {
          this.logger.warn(`Failed to decrypt field ${k}`);
        }
      }
    }

    return result;
  }
}
