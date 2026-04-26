import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { RbacGuard } from '../../../common/rbac.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { HiringStagesService } from '../services/hiring-stages.service';
import {
  CreateHiringStageDto,
  UpdateHiringStageDto,
  ReorderHiringStagesDto,
} from '../dto/hiring-stage.dto';

@Controller('api/v1/settings/stages')
@UseGuards(JwtAuthGuard, RbacGuard)
export class HiringStagesController {
  constructor(private readonly stagesService: HiringStagesService) {}

  /**
   * GET /api/v1/settings/stages
   * List all hiring stages for the tenant
   */
  @Get()
  async list(
    @Req() req: any,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.stagesService.list(
      req.user.tenantId,
      includeInactive === 'true',
      100, // Limit to 100 stages
    );
  }

  /**
   * GET /api/v1/settings/stages/:id
   * Get a single hiring stage
   */
  @Get(':id')
  async get(@Req() req: any, @Param('id') id: string) {
    return this.stagesService.get(req.user.tenantId, id);
  }

  /**
   * POST /api/v1/settings/stages
   * Create a new hiring stage (Admin only)
   */
  @Post()
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  async create(@Req() req: any, @Body() dto: CreateHiringStageDto) {
    return this.stagesService.create(req.user.tenantId, req.user.userId, dto);
  }

  /**
   * PUT /api/v1/settings/stages/:id
   * Update a hiring stage (Admin only)
   */
  @Put(':id')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateHiringStageDto,
  ) {
    return this.stagesService.update(
      req.user.tenantId,
      req.user.userId,
      id,
      dto,
    );
  }

  /**
   * PATCH /api/v1/settings/stages/reorder
   * Reorder hiring stages (Admin only)
   */
  @Patch('reorder')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  async reorder(@Req() req: any, @Body() dto: ReorderHiringStagesDto) {
    return this.stagesService.reorder(
      req.user.tenantId,
      req.user.userId,
      dto.stageIds,
    );
  }

  /**
   * PATCH /api/v1/settings/stages/:id/toggle
   * Toggle a hiring stage's active status (Admin only)
   */
  @Patch(':id/toggle')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  async toggle(@Req() req: any, @Param('id') id: string) {
    return this.stagesService.toggle(req.user.tenantId, req.user.userId, id);
  }

  /**
   * DELETE /api/v1/settings/stages/:id
   * Delete a hiring stage (Admin only, only if unused)
   */
  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @HttpCode(HttpStatus.OK)
  async delete(@Req() req: any, @Param('id') id: string) {
    return this.stagesService.delete(req.user.tenantId, req.user.userId, id);
  }
}
