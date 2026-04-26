import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaService } from '../../common/prisma.service';
import { S3Service } from '../../common/s3.service';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { FileScanProcessor } from './processors/file-scan.processor';
import { TextExtractProcessor } from './processors/text-extract.processor';

@Module({
  imports: [
    BullModule.registerQueue(
      {
        name: 'file-scan',
      },
      {
        name: 'file-text-extract',
      },
    ),
  ],
  controllers: [StorageController],
  providers: [
    PrismaService,
    S3Service,
    StorageService,
    FileScanProcessor,
    TextExtractProcessor,
  ],
  exports: [StorageService],
})
export class StorageModule {}
