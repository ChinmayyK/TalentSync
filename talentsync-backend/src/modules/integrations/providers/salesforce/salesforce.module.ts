import { Module } from '@nestjs/common';
import { SalesforceService } from './salesforce.service';
import { TokenStoreService } from '../../common/token-store.service';
import { PrismaService } from '../../../../common/prisma.service';

@Module({
    providers: [SalesforceService, TokenStoreService, PrismaService],
    exports: [SalesforceService]
})
export class SalesforceModule { }
