import { Module } from '@nestjs/common';
import { HubspotService } from './hubspot.service';
import { TokenStoreService } from '../../common/token-store.service';
import { PrismaService } from '../../../../common/prisma.service';

@Module({
    providers: [HubspotService, TokenStoreService, PrismaService],
    exports: [HubspotService]
})
export class HubspotModule { }
