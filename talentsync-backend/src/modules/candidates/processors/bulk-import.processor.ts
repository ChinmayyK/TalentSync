import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaService } from '../../../common/prisma.service';
import { Logger } from '@nestjs/common';
import { parseSpreadsheet, ParsedRow } from '../utils/spreadsheet-parser.util';

const logger = new Logger('BulkImportProcessor');

// Email validation regex (matches spreadsheet-parser.util.ts)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Result types for structured response
export interface BulkImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: Array<{
    row: number;
    name: string;
    reason: string;
  }>;
}

// Redis connection - will be closed when worker is stopped
let redisConnection: IORedis | null = null;
let worker: Worker | null = null;

export const startBulkImportProcessor = (prisma: PrismaService) => {
  // Create or reuse connection
  if (!redisConnection) {
    redisConnection = new IORedis(
      process.env.REDIS_URL || 'redis://127.0.0.1:6379',
      {
        maxRetriesPerRequest: null,
      },
    );
  }

  worker = new Worker(
    'candidates',
    async (job: Job) => {
      if (job.name === 'bulk-import') {
        const { tenantId, userId, source, fileBuffer, mimeType } = job.data;
        logger.log(
          `Bulk import job: ${job.id} tenantId=${tenantId} source=${source}`,
        );

        const result: BulkImportResult = {
          total: 0,
          imported: 0,
          skipped: 0,
          errors: [],
        };

        try {
          // Parse the spreadsheet
          const buffer = Buffer.from(fileBuffer, 'base64');
          const rows = parseSpreadsheet(buffer, mimeType);
          result.total = rows.length;

          // Collect all emails and phones for batch duplicate check
          const emails: string[] = [];
          const phones: string[] = [];
          rows.forEach((row) => {
            if (row.email) emails.push(row.email.toLowerCase());
            if (row.phone) phones.push(row.phone);
          });

          // Batch query for existing candidates to check duplicates
          const existingByEmail = await prisma.candidate.findMany({
            where: {
              tenantId,
              deletedAt: null,
              email: { in: emails, mode: 'insensitive' },
            },
            select: { email: true },
          });

          const existingByPhone = await prisma.candidate.findMany({
            where: {
              tenantId,
              deletedAt: null,
              phone: { in: phones },
            },
            select: { phone: true },
          });

          const existingEmails = new Set(
            existingByEmail.map((c) => c.email?.toLowerCase()),
          );
          const existingPhones = new Set(existingByPhone.map((c) => c.phone));

          // Process each row with validation
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2; // Excel rows are 1-indexed + header row

            // Validate required field: name
            if (!row.name || row.name.trim().length === 0) {
              result.errors.push({
                row: rowNum,
                name: '(empty)',
                reason: 'Name is required',
              });
              result.skipped++;
              continue;
            }

            // Validate email format if provided
            if (row.email && !EMAIL_REGEX.test(row.email)) {
              result.errors.push({
                row: rowNum,
                name: row.name,
                reason: `Invalid email format: ${row.email}`,
              });
              result.skipped++;
              continue;
            }

            // Check for duplicate email
            if (row.email && existingEmails.has(row.email.toLowerCase())) {
              result.errors.push({
                row: rowNum,
                name: row.name,
                reason: `Duplicate email: ${row.email}`,
              });
              result.skipped++;
              continue;
            }

            // Check for duplicate phone
            if (row.phone && existingPhones.has(row.phone)) {
              result.errors.push({
                row: rowNum,
                name: row.name,
                reason: `Duplicate phone: ${row.phone}`,
              });
              result.skipped++;
              continue;
            }

            // Create candidate
            try {
              await prisma.candidate.create({
                data: {
                  tenantId,
                  name: row.name.trim(),
                  email: row.email || null,
                  phone: row.phone || null,
                  roleTitle: row.roleTitle || null,
                  source: row.source || source || 'BULK_IMPORT',
                  stage: row.stage || 'applied',
                  tags: row.tags
                    ? row.tags.split(',').map((t) => t.trim())
                    : [],
                },
              });

              result.imported++;

              // Track email/phone to prevent within-batch duplicates
              if (row.email) existingEmails.add(row.email.toLowerCase());
              if (row.phone) existingPhones.add(row.phone);
            } catch (createError: any) {
              result.errors.push({
                row: rowNum,
                name: row.name,
                reason: createError.message || 'Failed to create candidate',
              });
              result.skipped++;
            }
          }

          logger.log(
            `Bulk import completed: ${result.imported} imported, ${result.skipped} skipped`,
          );
        } catch (parseError: any) {
          logger.error(`Bulk import failed: ${parseError.message}`);
          result.errors.push({
            row: 0,
            name: 'FILE',
            reason: parseError.message || 'Failed to parse file',
          });
        }

        // Store result for retrieval
        await prisma.auditLog.create({
          data: {
            tenantId,
            userId,
            action: 'BULK_IMPORT_COMPLETE',
            metadata: {
              jobId: job.id,
              source,
              result: JSON.parse(JSON.stringify(result)),
            },
          },
        });

        return result;
      }
    },
    { connection: redisConnection },
  );

  worker.on('completed', (job) =>
    logger.log(`Bulk import completed: ${job?.id}`),
  );
  worker.on('failed', (job, err) =>
    logger.error(`Bulk import failed: ${job?.id}`, err.stack),
  );
};

export const stopBulkImportProcessor = async () => {
  if (worker) {
    await worker.close();
    worker = null;
  }
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
  }
};
