import { Module } from '@nestjs/common';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [OffersController],
  providers: [OffersService, PrismaService],
  exports: [OffersService],
})
export class OffersModule {}
