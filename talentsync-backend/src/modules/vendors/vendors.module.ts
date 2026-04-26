import { Module } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { VendorsController } from './vendors.controller';
import { VendorPortalController } from './vendor-portal.controller';
import { PrismaService } from '../../common/prisma.service';
import { CandidatesModule } from '../candidates/candidates.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [CandidatesModule, StorageModule],
  controllers: [VendorsController, VendorPortalController],
  providers: [VendorsService, PrismaService],
  exports: [VendorsService],
})
export class VendorsModule {}
