import { Module } from '@nestjs/common';
import { CandidatePortalController } from './candidate-portal.controller';
import { CandidatePortalService } from './candidate-portal.service';
import { PortalTokenGuard } from './guards';
import { PrismaService } from '../../common/prisma.service';
import { S3Service } from '../../common/s3.service';

@Module({
  controllers: [CandidatePortalController],
  providers: [
    CandidatePortalService,
    PortalTokenGuard,
    PrismaService,
    S3Service,
  ],
  exports: [CandidatePortalService],
})
export class CandidatePortalModule {}

