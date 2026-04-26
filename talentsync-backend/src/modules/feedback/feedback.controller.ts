import {
  Controller,
  Post,
  Get,
  Body,
  Param,
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
import { FeedbackService } from './feedback.service';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('feedback')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/feedback')
@UseGuards(JwtAuthGuard, RbacGuard)
export class FeedbackController {
  constructor(private svc: FeedbackService) {}

  @Post()
  @Roles('INTERVIEWER', 'RECRUITER', 'MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Submit interview feedback' })
  @ApiBody({ type: SubmitFeedbackDto })
  @ApiResponse({ status: 201, description: 'Feedback submitted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid feedback data' })
  @ApiResponse({ status: 404, description: 'Interview not found' })
  submit(@Req() req: any, @Body() dto: SubmitFeedbackDto) {
    return this.svc.submitFeedback(req.user.tenantId, req.user.sub, dto);
  }

  @Get('interview/:id')
  @Roles('RECRUITER', 'MANAGER', 'ADMIN')
  @ApiOperation({ summary: 'Get all feedback for an interview' })
  @ApiParam({ name: 'id', description: 'Interview ID' })
  @ApiResponse({
    status: 200,
    description: 'List of feedback entries for the interview',
  })
  @ApiResponse({ status: 404, description: 'Interview not found' })
  getForInterview(@Req() req: any, @Param('id') id: string) {
    return this.svc.getInterviewFeedback(req.user.tenantId, id);
  }
}
