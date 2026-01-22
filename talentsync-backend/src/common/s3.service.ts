import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

@Injectable()
export class S3Service {
  private s3: S3Client;
  private logger = new Logger(S3Service.name);
  private bucket: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET_NAME || 'talentsync-assets';
    const endpoint = process.env.S3_ENDPOINT;

    const s3Config: any = {
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    };

    // Add endpoint for MinIO or custom S3
    if (endpoint) {
      s3Config.endpoint = endpoint;
      s3Config.forcePathStyle = process.env.S3_USE_PATH_STYLE === 'true'; // Required for MinIO
    }

    this.s3 = new S3Client(s3Config);
    this.logger.log(`S3 Service initialized with bucket: ${this.bucket}`);
  }

  async getPresignedUploadUrl(
    key: string,
    contentType: string = 'application/octet-stream',
    expiresIn: number = 3600,
  ) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    const url = await getSignedUrl(this.s3, command, { expiresIn });
    return url;
  }

  async getPresignedDownloadUrl(
    key: string,
    filename?: string,
    expiresIn: number = 3600,
  ) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: filename
        ? `attachment; filename="${filename}"`
        : undefined,
    });
    const url = await getSignedUrl(this.s3, command, { expiresIn });
    return url;
  }

  async streamFile(key: string): Promise<Readable> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3.send(command);
    return response.Body as Readable;
  }

  async downloadFile(key: string): Promise<Buffer> {
    const stream = await this.streamFile(key);
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3.send(command);
    this.logger.log(`Deleted file: ${key}`);
  }

  async copyFile(sourceKey: string, destKey: string): Promise<void> {
    const command = new CopyObjectCommand({
      Bucket: this.bucket,
      CopySource: `${this.bucket}/${sourceKey}`,
      Key: destKey,
    });

    await this.s3.send(command);
    this.logger.log(`Copied file from ${sourceKey} to ${destKey}`);
  }

  async uploadBuffer(
    key: string,
    buffer: Buffer,
    contentType: string = 'application/octet-stream',
  ): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await this.s3.send(command);
    this.logger.log(`Uploaded file: ${key}`);
  }

  getBucket(): string {
    return this.bucket;
  }
}

