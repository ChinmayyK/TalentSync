import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { VendorsService } from './vendors.service';
import {
  CreateVendorDto,
  UpdateVendorDto,
  InviteVendorUserDto,
  AssignJobDto,
} from './dto/vendors.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('api/v1/vendors')
@UseGuards(JwtAuthGuard, RbacGuard)
@Roles(Role.ADMIN, Role.SUPERADMIN, Role.MANAGER) // Only internal users can manage vendors
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post()
  create(@Request() req: any, @Body() createVendorDto: CreateVendorDto) {
    return this.vendorsService.create(req.user.tenantId, createVendorDto);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.vendorsService.findAll(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.vendorsService.findOne(req.user.tenantId, id);
  }

  @Patch(':id')
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateVendorDto: UpdateVendorDto,
  ) {
    return this.vendorsService.update(req.user.tenantId, id, updateVendorDto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.vendorsService.delete(req.user.tenantId, id);
  }

  @Post(':id/users')
  inviteUser(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: InviteVendorUserDto,
  ) {
    return this.vendorsService.inviteUser(req.user.tenantId, id, dto);
  }

  @Post(':id/jobs')
  assignJob(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: AssignJobDto,
  ) {
    return this.vendorsService.assignJob(req.user.tenantId, id, dto);
  }

  @Delete(':id/jobs/:jobId')
  removeJob(
    @Request() req: any,
    @Param('id') id: string,
    @Param('jobId') jobId: string,
  ) {
    return this.vendorsService.removeJob(req.user.tenantId, id, jobId);
  }
}
