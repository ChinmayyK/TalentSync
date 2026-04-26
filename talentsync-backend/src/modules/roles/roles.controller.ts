import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto, AssignRoleDto } from './dto/role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Roles')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/roles')
@UseGuards(JwtAuthGuard, RbacGuard)
export class RolesController {
  constructor(private rolesService: RolesService) {}

  // ============================================
  // PERMISSIONS
  // ============================================

  @Get('permissions')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all assignable permissions' })
  @ApiResponse({
    status: 200,
    description: 'List of permissions grouped by category',
  })
  listPermissions(@Req() req: any) {
    const isSuperAdmin = req.user.role === 'SUPERADMIN';
    return this.rolesService.listPermissions(isSuperAdmin);
  }

  @Post('permissions/seed')
  @Roles('SUPERADMIN')
  @ApiOperation({ summary: 'Seed default permissions (SUPERADMIN only)' })
  seedPermissions() {
    return this.rolesService.seedPermissions();
  }

  // ============================================
  // ROLES CRUD
  // ============================================

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all roles for tenant' })
  @ApiResponse({ status: 200, description: 'List of custom and system roles' })
  listRoles(@Req() req: any) {
    return this.rolesService.listRoles(req.user.tenantId);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a custom role' })
  @ApiBody({ type: CreateRoleDto })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid permissions or duplicate name',
  })
  createRole(@Req() req: any, @Body() dto: CreateRoleDto) {
    return this.rolesService.createRole(req.user.tenantId, req.user.sub, dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a custom role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiBody({ type: UpdateRoleDto })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 403, description: 'Cannot modify system roles' })
  updateRole(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.updateRole(
      req.user.tenantId,
      id,
      req.user.sub,
      dto,
    );
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a custom role' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete role with assigned users',
  })
  deleteRole(@Req() req: any, @Param('id') id: string) {
    return this.rolesService.deleteRole(req.user.tenantId, id, req.user.sub);
  }

  // ============================================
  // ROLE ASSIGNMENT
  // ============================================

  @Post('users/:userId/assign')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Assign a custom role to a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({ type: AssignRoleDto })
  @ApiResponse({ status: 200, description: 'Role assigned successfully' })
  assignRole(
    @Req() req: any,
    @Param('userId') userId: string,
    @Body() dto: AssignRoleDto,
  ) {
    return this.rolesService.assignRoleToUser(
      req.user.tenantId,
      userId,
      dto.roleId,
      req.user.sub,
    );
  }

  @Delete('users/:userId/roles/:roleId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Remove a custom role from a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'Role removed successfully' })
  removeRole(
    @Req() req: any,
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.rolesService.removeRoleFromUser(
      req.user.tenantId,
      userId,
      roleId,
      req.user.sub,
    );
  }
}
