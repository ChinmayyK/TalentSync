import { Module } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { DomainVerificationProcessor } from './processors/domain-verification.processor';
import { PrismaService } from '../../common/prisma.service';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'domain-verification',
    }),
  ],
  controllers: [TenantsController],
  providers: [TenantsService, DomainVerificationProcessor, PrismaService],
  exports: [TenantsService],
})
export class TenantsModule {}

