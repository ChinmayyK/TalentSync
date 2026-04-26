import { Module } from '@nestjs/common';
import { IdentityProviderService } from './identity-provider.service';
import { IdentityProviderController } from './identity-provider.controller';
import { AppCommonModule } from '../../common/app-common.module';

@Module({
  imports: [AppCommonModule],
  controllers: [IdentityProviderController],
  providers: [IdentityProviderService],
  exports: [IdentityProviderService],
})
export class IdentityProviderModule {}
