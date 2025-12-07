import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { IdentityProviderService } from './identity-provider.service';
import { CreateIdentityProviderDto } from './dto/create-identity-provider.dto';
import { UpdateIdentityProviderDto } from './dto/update-identity-provider.dto';
import { AuthGuard } from '../../common/auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Identity Providers')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1/identity-providers')
export class IdentityProviderController {
  constructor(
    private readonly identityProviderService: IdentityProviderService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all SSO providers for tenant' })
  findAll(@Request() req: any) {
    return this.identityProviderService.findAll(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get SSO provider details' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.identityProviderService.findOne(req.user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create SSO provider configuration (Admin only)' })
  create(@Request() req: any, @Body() dto: CreateIdentityProviderDto) {
    return this.identityProviderService.create(
      req.user.tenantId,
      req.user.sub,
      req.user.role,
      dto,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update SSO provider configuration (Admin only)' })
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateIdentityProviderDto,
  ) {
    return this.identityProviderService.update(
      req.user.tenantId,
      req.user.sub,
      req.user.role,
      id,
      dto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete SSO provider (Admin only)' })
  delete(@Request() req: any, @Param('id') id: string) {
    return this.identityProviderService.delete(
      req.user.tenantId,
      req.user.role,
      id,
    );
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Enable/Disable SSO provider (Admin only)' })
  toggle(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.identityProviderService.toggleEnabled(
      req.user.tenantId,
      req.user.sub,
      req.user.role,
      id,
      body.enabled,
    );
  }
}

