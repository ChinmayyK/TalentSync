import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { EmailService } from './email.service';
import { AuthGuard } from '../../common/auth.guard';
import { RbacGuard } from '../../common/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Controller('api/v1/email')
@UseGuards(AuthGuard, RbacGuard)
export class EmailController {
  constructor(private svc: EmailService) {}

  // preview template (admin or manager)
  @Post('preview')
  @Roles('ADMIN', 'MANAGER', 'SUPERADMIN')
  preview(@Body() body: { template: string; context: any }) {
    return this.svc.previewTemplate(body.template, body.context);
  }

  // trigger test send (tenant admin)
  @Post('send-test')
  @Roles('ADMIN', 'SUPERADMIN')
  sendTest(
    @Req() req: any,
    @Body() body: { to: string; template: string; context: any },
  ) {
    // Validate email format
    if (!body.to || !EMAIL_REGEX.test(body.to)) {
      throw new BadRequestException('Invalid email address');
    }
    return this.svc.enqueue(req.tenantId, {
      to: body.to,
      template: body.template,
      context: body.context,
    });
  }
}
