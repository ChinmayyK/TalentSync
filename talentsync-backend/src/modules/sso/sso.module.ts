import { Module } from '@nestjs/common';
import { SSOService } from './sso.service';
import { SSOController } from './sso.controller';
import { IdentityProviderModule } from '../identity-provider/identity-provider.module';
import { AppCommonModule } from '../../common/app-common.module';

@Module({
  imports: [AppCommonModule, IdentityProviderModule],
  controllers: [SSOController],
  providers: [SSOService],
  exports: [SSOService],
})
export class SSOModule {}

