import { Module } from '@nestjs/common';
import { ResumeInboxController } from './resume-inbox.controller';
import { ResumeInboxService } from './resume-inbox.service';
import { ImapService } from './imap.service';
import { PrismaService } from '../../common/prisma.service';
import { S3Service } from '../../common/s3.service';
import { ResumeParserService } from '../candidates/services/resume-parser.service';

@Module({
  controllers: [ResumeInboxController],
  providers: [
    ResumeInboxService,
    ImapService,
    PrismaService,
    S3Service,
    ResumeParserService,
  ],
  exports: [ResumeInboxService, ImapService],
})
export class ResumeInboxModule {}
