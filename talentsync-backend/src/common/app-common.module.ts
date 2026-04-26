import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { BruteForceService } from './brute-force.guard';
import { PasswordPolicyService } from './password-policy.service';
import { IPAllowlistService } from './ip-allowlist.guard';
import { S3Service } from './s3.service';
import Redis from 'ioredis';

@Global()
@Module({
  providers: [
    PrismaService,
    S3Service,
    BruteForceService,
    PasswordPolicyService,
    IPAllowlistService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        return new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        });
      },
    },
  ],
  exports: [
    PrismaService,
    S3Service,
    BruteForceService,
    PasswordPolicyService,
    IPAllowlistService,
    'REDIS_CLIENT',
  ],
})
export class AppCommonModule {}
