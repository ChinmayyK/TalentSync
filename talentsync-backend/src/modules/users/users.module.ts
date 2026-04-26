import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { InvitationEmailProcessor } from './processors/invitation-email.processor';
import { PrismaService } from '../../common/prisma.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'user-invitations',
    }),
    EmailModule,
  ],
  controllers: [UsersController],
  providers: [PrismaService, UsersService, InvitationEmailProcessor],
  exports: [UsersService],
})
export class UsersModule {}
