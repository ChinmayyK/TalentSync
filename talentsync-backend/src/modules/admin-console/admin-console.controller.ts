import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Param,
  Patch,
} from '@nestjs/common';
import { AdminConsoleService } from './admin-console.service';
import { PlatformRbacGuard } from './guards/platform-rbac.guard';
import { AuthGuard } from '../../common/auth.guard';
import { CreatePlatformUserDto } from './dto/create-platform-user.dto';
import { CreateTenantProvisionDto } from './dto/create-tenant-provision.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('api/v1/admin')
@UseGuards(AuthGuard, PlatformRbacGuard)
export class AdminConsoleController {
  constructor(private svc: AdminConsoleService) {}

  // ============================================
  // PLATFORM USERS
  // ============================================

  @Post('platform-users')
  createPlatformUser(@Req() req: any, @Body() dto: CreatePlatformUserDto) {
    return this.svc.createPlatformUser(dto, req.user.sub);
  }

  // ============================================
  // TENANT MANAGEMENT
  // ============================================

  @Post('provision-tenant')
  @Roles('SUPERADMIN')
  provisionTenant(@Req() req: any, @Body() dto: CreateTenantProvisionDto) {
    return this.svc.provisionTenant(dto, req.user.sub);
  }

  @Get('tenants')
  listTenants() {
    return this.svc.listTenants();
  }

  @Get('tenants/:id')
  getTenantDetails(@Param('id') id: string) {
    return this.svc.getTenantDetails(id);
  }

  @Get('tenants/:id/status')
  tenantStatus(@Param('id') id: string) {
    return this.svc.tenantStatus(id);
  }

  @Patch('tenants/:id/status')
  @Roles('SUPERADMIN')
  updateTenantStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.svc.updateTenantStatus(id, body.enabled, req.user.sub);
  }

  @Post('tenants/:id/create-admin')
  @Roles('SUPERADMIN')
  createTenantAdmin(
    @Req() req: any,
    @Param('id') id: string,
    @Body('email') email: string,
  ) {
    return this.svc.createTenantAdmin(id, email, req.user.sub);
  }

  @Patch('tenants/:tenantId/users/:userId/role')
  @Roles('SUPERADMIN')
  assignUserRole(
    @Req() req: any,
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Body('role') role: 'ADMIN' | 'MANAGER' | 'RECRUITER' | 'INTERVIEWER',
  ) {
    return this.svc.assignUserRole(tenantId, userId, role, req.user.sub);
  }

  // ============================================
  // USER OVERSIGHT
  // ============================================

  @Get('tenants/:id/users')
  listTenantUsers(@Param('id') id: string) {
    return this.svc.listTenantUsers(id);
  }

  @Patch('users/:id/status')
  @Roles('SUPERADMIN')
  updateUserStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { status: 'ACTIVE' | 'INACTIVE' },
  ) {
    return this.svc.updateUserStatus(id, body.status, req.user.sub);
  }

  // ============================================
  // INTEGRATION CONTROL
  // ============================================

  @Get('integrations')
  listAllIntegrations() {
    return this.svc.listAllIntegrations();
  }

  @Get('integrations/summary')
  getIntegrationSummary() {
    return this.svc.getIntegrationSummary();
  }

  @Patch('tenants/:tenantId/integrations/:provider')
  @Roles('SUPERADMIN')
  updateIntegrationStatus(
    @Req() req: any,
    @Param('tenantId') tenantId: string,
    @Param('provider') provider: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.svc.updateIntegrationStatus(
      tenantId,
      provider,
      body.enabled,
      req.user.sub,
    );
  }

  // ============================================
  // SYSTEM HEALTH
  // ============================================

  @Get('system-health')
  getSystemHealth() {
    return this.svc.getSystemHealth();
  }
}
