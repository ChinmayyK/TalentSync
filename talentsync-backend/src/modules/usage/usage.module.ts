import { Module } from '@nestjs/common';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [UsageController],
  providers: [PrismaService, UsageService],
  exports: [UsageService],
})
export class UsageModule {}
