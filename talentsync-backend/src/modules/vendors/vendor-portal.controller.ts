import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { CandidatesService } from '../candidates/candidates.service';
import { StorageService } from '../storage/storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('api/v1/portal/vendor')
@UseGuards(JwtAuthGuard, RbacGuard)
@Roles(Role.VENDOR)
export class VendorPortalController {
  constructor(
    private readonly vendorsService: VendorsService,
    private readonly candidatesService: CandidatesService,
    private readonly storageService: StorageService,
  ) {}

  @Get('jobs')
  getMyJobs(@Request() req: any) {
    const vendorId = req.user.vendorId;
    if (!vendorId)
      throw new ForbiddenException('User is not associated with a vendor');
    return this.vendorsService.getMyJobs(vendorId);
  }

  @Get('jobs/:id')
  getJob(@Request() req: any, @Param('id') id: string) {
    const vendorId = req.user.vendorId;
    if (!vendorId)
      throw new ForbiddenException('User is not associated with a vendor');
    return this.vendorsService.getMyJob(vendorId, id);
  }

  @Get('candidates')
  getMyCandidates(@Request() req: any) {
    const vendorId = req.user.vendorId;
    if (!vendorId)
      throw new ForbiddenException('User is not associated with a vendor');
    return this.vendorsService.getMyCandidates(vendorId);
  }

  @Post('candidates')
  async submitCandidate(@Request() req: any, @Body() dto: any) {
    const vendorId = req.user.vendorId;
    if (!vendorId)
      throw new ForbiddenException('User is not associated with a vendor');

    // Pass vendorId via DTO (overriding any input)
    const createDto = {
      ...dto,
      vendorId: vendorId,
      source: 'Vendor Portal', // Force source
    };

    // We need tenantId. req.user.tenantId should be set by JWT guard.
    return this.candidatesService.create(
      req.user.tenantId,
      req.user.id,
      createDto,
    );
  }

  @Post('upload-url')
  async getUploadUrl(@Request() req: any, @Body() dto: { filename: string }) {
    const vendorId = req.user.vendorId;
    if (!vendorId)
      throw new ForbiddenException('User is not associated with a vendor');

    return this.storageService.generateUploadUrl(
      req.user.tenantId,
      req.user.id,
      {
        filename: dto.filename,
        linkedType: 'vendor_submission', // Placeholder or use 'candidate' if allowed
        // We don't have linkedId yet
      },
    );
  }
}
