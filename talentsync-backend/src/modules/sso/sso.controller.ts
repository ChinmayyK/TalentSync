import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { SSOService } from './sso.service';
import { InitiateSSODto } from './dto/initiate-sso.dto';
import { SSOCallbackDto } from './dto/sso-callback.dto';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { RateLimited, RateLimitProfile } from '../../common/rate-limit';

@ApiTags('SSO')
@Controller('api/v1/sso')
export class SSOController {
  constructor(private readonly ssoService: SSOService) {}

  @Get(':tenantId/providers')
  @RateLimited(RateLimitProfile.READ)
  @ApiOperation({
    summary: 'Get available SSO providers for a tenant (public)',
  })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  getProviders(@Param('tenantId') tenantId: string) {
    return this.ssoService.getAvailableProviders(tenantId);
  }

  @Post(':tenantId/initiate')
  @RateLimited(RateLimitProfile.AUTH)
  @ApiOperation({ summary: 'Initiate SSO flow (returns mock redirect URL)' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  initiate(@Param('tenantId') tenantId: string, @Body() dto: InitiateSSODto) {
    // Note: In a real implementation, we'd get caller role from JWT if present
    // For now, pass undefined to allow unauthenticated SSO initiation
    return this.ssoService.initiate(tenantId, undefined, dto);
  }

  @Post(':tenantId/callback')
  @RateLimited(RateLimitProfile.AUTH)
  @ApiOperation({ summary: 'Handle SSO callback (mock implementation)' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  callback(@Param('tenantId') tenantId: string, @Body() dto: SSOCallbackDto) {
    return this.ssoService.callback(tenantId, dto);
  }
}
