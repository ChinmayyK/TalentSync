import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { HiringStagesService } from './services/hiring-stages.service';
import { HiringStagesController } from './controllers/hiring-stages.controller';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [SettingsController, HiringStagesController],
  providers: [SettingsService, HiringStagesService, PrismaService],
  exports: [SettingsService, HiringStagesService],
})
export class SettingsModule {}
