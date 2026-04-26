import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
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
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { ListTeamsDto } from './dto/list-teams.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('teams')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/teams')
@UseGuards(JwtAuthGuard, RbacGuard)
export class TeamsController {
  constructor(private teamsService: TeamsService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a new team' })
  @ApiResponse({ status: 201, description: 'Team created successfully' })
  @ApiResponse({ status: 400, description: 'Team name already exists' })
  @ApiBody({ type: CreateTeamDto })
  createTeam(@Req() req: any, @Body() dto: CreateTeamDto) {
    return this.teamsService.createTeam(req.user.tenantId, req.user.sub, dto);
  }

  @Get()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'List all teams with pagination and search' })
  @ApiResponse({ status: 200, description: 'List of teams' })
  listTeams(@Req() req: any, @Query() dto: ListTeamsDto) {
    return this.teamsService.listTeams(req.user.tenantId, dto);
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get team by ID' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @ApiResponse({ status: 200, description: 'Team details' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  getTeam(@Req() req: any, @Param('id') teamId: string) {
    return this.teamsService.getTeam(req.user.tenantId, teamId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update team details' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @ApiResponse({ status: 200, description: 'Team updated successfully' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  @ApiBody({ type: UpdateTeamDto })
  updateTeam(
    @Req() req: any,
    @Param('id') teamId: string,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.teamsService.updateTeam(
      req.user.tenantId,
      req.user.sub,
      teamId,
      dto,
    );
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Delete team' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @ApiResponse({ status: 200, description: 'Team deleted successfully' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  deleteTeam(@Req() req: any, @Param('id') teamId: string) {
    return this.teamsService.deleteTeam(
      req.user.tenantId,
      req.user.sub,
      teamId,
    );
  }

  @Post(':id/members')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Add member to team' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @ApiResponse({ status: 201, description: 'Member added successfully' })
  @ApiResponse({
    status: 400,
    description: 'User already a member or not found',
  })
  @ApiBody({ type: AddMemberDto })
  addMember(
    @Req() req: any,
    @Param('id') teamId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.teamsService.addMember(
      req.user.tenantId,
      req.user.sub,
      teamId,
      dto,
    );
  }

  @Delete(':id/members/:memberId')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Remove member from team' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  removeMember(
    @Req() req: any,
    @Param('id') teamId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.teamsService.removeMember(
      req.user.tenantId,
      req.user.sub,
      teamId,
      memberId,
    );
  }

  @Get(':id/members')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get team members with effective roles' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  @ApiResponse({ status: 200, description: 'List of team members' })
  getTeamMembers(@Req() req: any, @Param('id') teamId: string) {
    return this.teamsService.getTeamMembers(req.user.tenantId, teamId);
  }
}
