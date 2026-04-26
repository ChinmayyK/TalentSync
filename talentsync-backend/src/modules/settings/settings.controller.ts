import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { UpdateDomainDto } from './dto/update-domain.dto';
import { UpdateSsoDto } from './dto/update-sso.dto';
import { UpdateSmtpDto } from './dto/update-smtp.dto';
import { TestSmtpDto } from './dto/test-smtp.dto';
import { CreateApiKeyDto } from './dto/create-apikey.dto';
import { RevokeApiKeyDto } from './dto/revoke-apikey.dto';
import { UpdateSecurityPolicyDto } from './dto/update-security.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('settings')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/settings')
@UseGuards(JwtAuthGuard, RbacGuard)
export class SettingsController {
  constructor(private svc: SettingsService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get all tenant settings' })
  @ApiResponse({
    status: 200,
    description:
      'Tenant settings including branding, domain, SSO, SMTP configuration',
  })
  getSettings(@Req() req: any) {
    return this.svc.getSettings(req.user.tenantId);
  }

  @Patch('branding')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update tenant branding (logo, colors, name)' })
  @ApiBody({ type: UpdateBrandingDto })
  @ApiResponse({ status: 200, description: 'Branding updated successfully' })
  updateBranding(@Req() req: any, @Body() dto: UpdateBrandingDto) {
    return this.svc.updateBranding(req.user.tenantId, req.user.sub, dto);
  }

  @Patch('domain')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update domain configuration' })
  @ApiBody({ type: UpdateDomainDto })
  @ApiResponse({
    status: 200,
    description: 'Domain settings updated successfully',
  })
  updateDomain(@Req() req: any, @Body() dto: UpdateDomainDto) {
    return this.svc.updateDomain(req.user.tenantId, req.user.sub, dto);
  }

  @Patch('sso')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update SSO/SAML configuration' })
  @ApiBody({ type: UpdateSsoDto })
  @ApiResponse({ status: 200, description: 'SSO configuration updated' })
  updateSso(@Req() req: any, @Body() dto: UpdateSsoDto) {
    return this.svc.updateSso(req.user.tenantId, req.user.sub, dto);
  }

  @Patch('smtp')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update SMTP/email configuration' })
  @ApiBody({ type: UpdateSmtpDto })
  @ApiResponse({ status: 200, description: 'SMTP configuration updated' })
  updateSmtp(@Req() req: any, @Body() dto: UpdateSmtpDto) {
    return this.svc.updateSmtp(req.user.tenantId, req.user.sub, dto);
  }

  @Post('smtp/test')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Test SMTP configuration by sending a test email' })
  @ApiBody({ type: TestSmtpDto })
  @ApiResponse({ status: 200, description: 'Test email sent successfully' })
  @ApiResponse({
    status: 400,
    description: 'SMTP configuration invalid or email failed',
  })
  testSmtp(@Req() req: any, @Body() dto: TestSmtpDto) {
    return this.svc.testSmtp(req.user.tenantId, dto);
  }

  @Post('apikeys')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiBody({ type: CreateApiKeyDto })
  @ApiResponse({
    status: 201,
    description: 'API key created',
    schema: { example: { id: '...', key: 'sk_live_...', name: 'Production' } },
  })
  createApiKey(@Req() req: any, @Body() dto: CreateApiKeyDto) {
    return this.svc.createApiKey(req.user.tenantId, req.user.sub, dto);
  }

  @Get('apikeys')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all API keys for tenant' })
  @ApiResponse({
    status: 200,
    description: 'List of API keys (keys are masked)',
  })
  listApiKeys(@Req() req: any) {
    return this.svc.listApiKeys(req.user.tenantId);
  }

  @Post('apikeys/revoke')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiBody({ type: RevokeApiKeyDto })
  @ApiResponse({ status: 200, description: 'API key revoked' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  revokeApiKey(@Req() req: any, @Body() dto: RevokeApiKeyDto) {
    return this.svc.revokeApiKey(req.user.tenantId, req.user.sub, dto.id);
  }

  @Get('security')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get security policy settings' })
  @ApiResponse({
    status: 200,
    description: 'Security policy including password rules, MFA settings',
  })
  getSecurityPolicy(@Req() req: any) {
    return this.svc.getSecurityPolicy(req.user.tenantId);
  }

  @Patch('security')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update security policy' })
  @ApiBody({ type: UpdateSecurityPolicyDto })
  @ApiResponse({ status: 200, description: 'Security policy updated' })
  updateSecurityPolicy(@Req() req: any, @Body() dto: UpdateSecurityPolicyDto) {
    return this.svc.updateSecurityPolicy(req.user.tenantId, req.user.sub, dto);
  }
}
