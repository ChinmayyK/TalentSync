import { Module } from '@nestjs/common';
import { AdminConsoleController } from './admin-console.controller';
import { AdminConsoleService } from './admin-console.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [AdminConsoleController],
  providers: [AdminConsoleService, PrismaService],
  exports: [AdminConsoleService],
})
export class AdminConsoleModule {}

