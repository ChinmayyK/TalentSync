import { Module } from '@nestjs/common';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [TeamsController],
  providers: [PrismaService, TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
