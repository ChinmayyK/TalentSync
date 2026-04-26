import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('users')
@Controller('api/v1/users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('invite')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Invite a new user to the tenant' })
  @ApiResponse({ status: 201, description: 'Invitation sent successfully' })
  @ApiResponse({
    status: 400,
    description: 'User already exists or invalid role',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiBody({ type: InviteUserDto })
  inviteUser(@Req() req: any, @Body() dto: InviteUserDto) {
    return this.usersService.inviteUser(req.user.tenantId, req.user.sub, dto);
  }

  @Post('accept-invite')
  @ApiOperation({ summary: 'Accept invitation and set password' })
  @ApiResponse({ status: 200, description: 'Account activated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @ApiBody({ type: AcceptInviteDto })
  acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.usersService.acceptInvite(dto);
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'List all users in tenant with search and filters' })
  @ApiResponse({ status: 200, description: 'List of users' })
  listUsers(@Req() req: any, @Query() dto: ListUsersDto) {
    return this.usersService.listUsers(req.user.tenantId, dto);
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUser(@Req() req: any, @Param('id') id: string) {
    return this.usersService.getUser(req.user.tenantId, id);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update user details' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiBody({ type: UpdateUserDto })
  updateUser(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(
      req.user.tenantId,
      req.user.sub,
      id,
      dto,
    );
  }

  @Post(':id/activate')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Activate user account' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User activated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  activateUser(@Req() req: any, @Param('id') id: string) {
    return this.usersService.activateUser(req.user.tenantId, req.user.sub, id);
  }

  @Post(':id/deactivate')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Deactivate user account' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deactivated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  deactivateUser(@Req() req: any, @Param('id') id: string) {
    return this.usersService.deactivateUser(
      req.user.tenantId,
      req.user.sub,
      id,
    );
  }
}
