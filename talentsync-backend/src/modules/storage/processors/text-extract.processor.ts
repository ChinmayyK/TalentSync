import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { S3Service } from '../../../common/s3.service';
import { extractText } from '../utils/text-extract.util';
import { runOCR, isImageMimeType } from '../utils/ocr.util';

interface ExtractJobData {
  fileId: string;
  tenantId: string;
  s3Key: string;
  mimeType: string;
}

@Processor('file-text-extract')
@Injectable()
export class TextExtractProcessor extends WorkerHost {
  private readonly logger = new Logger(TextExtractProcessor.name);

  constructor(
    private prisma: PrismaService,
    private s3: S3Service,
  ) {
    super();
  }

  async process(job: Job<ExtractJobData>): Promise<any> {
    const { fileId, tenantId, s3Key, mimeType } = job.data;

    this.logger.log(`Extracting text from file ${fileId}`);

    try {
      // Download file from S3
      const stream = await this.s3.streamFile(s3Key);

      // Convert stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);

      let extractedText = '';

      // Extract text based on MIME type
      if (isImageMimeType(mimeType)) {
        const ocrResult = await runOCR(buffer);
        extractedText = ocrResult.text;
      } else {
        extractedText = await extractText(buffer, mimeType);
      }

      // Update file metadata with extracted text
      const file = await this.prisma.fileObject.findUnique({
        where: { id: fileId },
      });

      if (!file) {
        this.logger.error(`File ${fileId} not found`);
        throw new Error('File not found');
      }

      await this.prisma.fileObject.update({
        where: { id: fileId },
        data: {
          metadata: {
            ...((file.metadata as object) || {}),
            extractedText,
            extractedAt: new Date().toISOString(),
          },
        },
      });

      // If linked to candidate, update search index
      if (file.linkedType === 'candidate' && file.linkedId) {
        // TODO: Update candidate search index
        // This could involve updating a full-text search field or external search engine
      }

      this.logger.log(
        `Text extraction complete for file ${fileId} - ${extractedText.length} characters`,
      );

      return { success: true, textLength: extractedText.length };
    } catch (error) {
      this.logger.error(`Text extraction failed for ${fileId}:`, error.message);
      throw error;
    }
  }
}

