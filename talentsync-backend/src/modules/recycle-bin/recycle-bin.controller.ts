import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { RecycleBinService } from './recycle-bin.service';
import { AuthGuard } from '../../common/auth.guard';
import { ListRecycleBinDto } from './dto/list-recycle-bin.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Recycle Bin')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1/recycle-bin')
export class RecycleBinController {
  constructor(private readonly recycleBinService: RecycleBinService) {}

  @Get()
  @ApiOperation({ summary: 'List deleted items (role-based filtering)' })
  @ApiQuery({
    name: 'module',
    required: false,
    description: 'Filter by module type',
  })
  @ApiQuery({ name: 'from', required: false, description: 'Filter from date' })
  @ApiQuery({ name: 'to', required: false, description: 'Filter to date' })
  @ApiQuery({
    name: 'deletedBy',
    required: false,
    description: 'Filter by user (admin only)',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'perPage', required: false, description: 'Items per page' })
  list(@Request() req: any, @Query() dto: ListRecycleBinDto) {
    return this.recycleBinService.findAll(
      req.user.tenantId,
      req.user.sub,
      req.user.role,
      dto,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get recycle bin statistics by module' })
  getStats(@Request() req: any) {
    return this.recycleBinService.getStats(
      req.user.tenantId,
      req.user.sub,
      req.user.role,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get deleted item details (role-based access)' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.recycleBinService.findOne(
      req.user.tenantId,
      req.user.sub,
      req.user.role,
      id,
    );
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore a deleted item (owner or admin)' })
  restore(@Request() req: any, @Param('id') id: string) {
    return this.recycleBinService.restore(
      req.user.tenantId,
      req.user.sub,
      req.user.role,
      id,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Permanently delete an item (admin only)' })
  purge(@Request() req: any, @Param('id') id: string) {
    return this.recycleBinService.purge(
      req.user.tenantId,
      req.user.sub,
      req.user.role,
      id,
    );
  }
}
