import {
  Controller,
  Get,
  Post,
  Put,
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
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { OffersService } from './offers.service';
import {
  CreateOfferDto,
  UpdateOfferDto,
  QueryOffersDto,
  RespondToOfferDto,
} from './dto';

@ApiTags('Offers')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('api/v1/offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Post()
  @Roles('RECRUITER', 'MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Create a new offer' })
  async create(@Req() req: any, @Body() dto: CreateOfferDto) {
    return this.offersService.create(req.user.tenantId, dto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'List all offers with filtering' })
  async findAll(@Req() req: any, @Query() query: QueryOffersDto) {
    return this.offersService.findAll(req.user.tenantId, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get offer statistics' })
  async getStats(@Req() req: any) {
    return this.offersService.getStats(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get offer by ID' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.offersService.findOne(req.user.tenantId, id);
  }

  @Put(':id')
  @Roles('RECRUITER', 'MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Update an offer' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateOfferDto,
  ) {
    return this.offersService.update(req.user.tenantId, id, dto);
  }

  @Post(':id/send')
  @Roles('RECRUITER', 'MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Send offer to candidate' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  async send(@Req() req: any, @Param('id') id: string) {
    return this.offersService.send(req.user.tenantId, id, req.user.sub);
  }

  @Post(':id/withdraw')
  @Roles('RECRUITER', 'MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Withdraw an offer' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  async withdraw(@Req() req: any, @Param('id') id: string) {
    return this.offersService.withdraw(req.user.tenantId, id);
  }

  @Post(':id/respond')
  @ApiOperation({ summary: 'Respond to an offer (accept/decline/counter)' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  @ApiBody({ type: RespondToOfferDto })
  async respond(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: RespondToOfferDto,
  ) {
    return this.offersService.respond(req.user.tenantId, id, dto.response, {
      declineReason: dto.declineReason,
      counterOffer: dto.counterOffer,
    });
  }

  @Post(':id/viewed')
  @ApiOperation({ summary: 'Mark offer as viewed' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  async markViewed(@Req() req: any, @Param('id') id: string) {
    return this.offersService.markViewed(req.user.tenantId, id);
  }

  @Delete(':id')
  @Roles('RECRUITER', 'MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Delete a draft offer' })
  @ApiParam({ name: 'id', description: 'Offer ID' })
  async delete(@Req() req: any, @Param('id') id: string) {
    return this.offersService.delete(req.user.tenantId, id);
  }
}
