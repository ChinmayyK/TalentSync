import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { GenerateDomainTokenDto } from './dto/generate-domain-token.dto';
import { VerifyDomainDto } from './dto/verify-domain.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('api/v1/tenants')
export class TenantsController {
  constructor(private svc: TenantsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles('SUPERADMIN')
  create(@Req() req: any, @Body() dto: CreateTenantDto) {
    return this.svc.create(dto, req.user.sub);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles('SUPERADMIN')
  findAll() {
    return this.svc.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles('SUPERADMIN', 'ADMIN')
  findOne(@Req() req: any, @Param('id') id: string) {
    // ADMIN can only access their own tenant
    if (req.user.role !== 'SUPERADMIN' && req.user.tenantId !== id) {
      throw new ForbiddenException('Cannot access tenant you do not belong to');
    }
    return this.svc.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles('SUPERADMIN')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.svc.update(id, dto, req.user.sub);
  }

  @Post(':id/domain/generate')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles('SUPERADMIN')
  generateDomainToken(
    @Param('id') id: string,
    @Body() dto: GenerateDomainTokenDto,
  ) {
    return this.svc.generateDomainVerificationToken(id, dto.domain);
  }

  @Post(':id/domain/verify')
  // Public/Protected? Prompt says "Public & Platform". Let's protect for manual flow via admin, public via webhook/processor usually.
  // "accept token to verify (useful for dev/manual flows)" implies usage via curl by admin.
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles('SUPERADMIN', 'ADMIN')
  verifyDomain(@Param('id') id: string, @Body() dto: VerifyDomainDto) {
    return this.svc.verifyDomain(id, dto.token);
  }

  // ============================================
  // USER-FACING TENANT ENDPOINTS
  // ============================================

  /**
   * Get all tenants the current user belongs to
   * Used by frontend to populate tenant selector
   */
  @Get('my-tenants')
  @UseGuards(JwtAuthGuard)
  getMyTenants(@Req() req: any) {
    return this.svc.getTenantsForUser(req.user.sub);
  }

  /**
   * Get tenant branding (public for invite flow)
   * Can be called without auth for invite preview
   */
  @Get(':id/branding')
  getBranding(@Param('id') id: string) {
    return this.svc.getBranding(id);
  }

  /**
   * Update tenant branding (admin only)
   */
  @Patch(':id/branding')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles('ADMIN')
  updateBranding(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: { logoUrl?: string; colors?: Record<string, string> },
  ) {
    // Verify user has access to this tenant
    if (req.user.role !== 'SUPERADMIN' && req.user.tenantId !== id) {
      throw new ForbiddenException(
        'Cannot update branding for a different tenant',
      );
    }
    return this.svc.updateBranding(id, req.user.sub, dto);
  }
}
