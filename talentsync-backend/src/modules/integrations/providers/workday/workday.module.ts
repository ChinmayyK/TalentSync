import { Module } from '@nestjs/common';
import { WorkdayService } from './workday.service';
import { TokenStoreService } from '../../common/token-store.service';
import { PrismaService } from '../../../../common/prisma.service';

@Module({
    providers: [WorkdayService, TokenStoreService, PrismaService],
    exports: [WorkdayService]
})
export class WorkdayModule { }
