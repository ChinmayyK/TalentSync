import { Module } from '@nestjs/common';
import { JobBoardsController } from './job-boards.controller';
import { JobBoardsService } from './job-boards.service';
import {
  IndeedProvider,
  LinkedInProvider,
  GlassdoorProvider,
  ZipRecruiterProvider,
} from './providers';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [JobBoardsController],
  providers: [
    JobBoardsService,
    IndeedProvider,
    LinkedInProvider,
    GlassdoorProvider,
    ZipRecruiterProvider,
    PrismaService,
  ],
  exports: [JobBoardsService],
})
export class JobBoardsModule {}

