import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { InvitationService } from './invitation.service';
import { PasswordResetService } from './password-reset.service';
import { TwoFactorService } from './two-factor.service';
import { SessionService } from './session.service';
import { PrismaService } from '../../common/prisma.service';
import { EmailModule } from '../email/email.module';
import { AuditModule } from '../audit/audit.module';
import { BruteForceService } from '../../common/brute-force.guard';
import { PasswordPolicyService } from '../../common/password-policy.service';
import { PermissionGuard } from './guards/permissions.guard';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [EmailModule, AuditModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    InvitationService,
    PasswordResetService,
    TwoFactorService,
    SessionService,
    PrismaService,
    BruteForceService,
    PasswordPolicyService,
    PermissionGuard,
    JwtStrategy,
  ],
  exports: [
    AuthService,
    InvitationService,
    TwoFactorService,
    SessionService,
    BruteForceService,
    PasswordPolicyService,
    PermissionGuard,
  ],
})
export class AuthModule {}
