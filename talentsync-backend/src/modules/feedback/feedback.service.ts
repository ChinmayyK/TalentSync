import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { ensureInterviewerCanSubmit } from './validators/feedback-permission.util';

import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class FeedbackService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async submitFeedback(
    tenantId: string,
    userId: string,
    dto: SubmitFeedbackDto,
  ) {
    // 1. Fetch Interview
    const interview = await this.prisma.interview.findFirst({
      where: { id: dto.interviewId, tenantId },
      include: { candidate: true }, // Need candidateId
    });
    if (!interview) throw new NotFoundException('Interview not found');

    // Validate rating range (1-5)
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // 2. Validate Permission (throws ForbiddenException directly)
    ensureInterviewerCanSubmit(interview, userId);

    // 3. Upsert Feedback
    const feedback = await this.prisma.feedback.upsert({
      where: {
        // Using composite unique constraint if defined?
        // Schema has: @@unique([interviewerId, interviewId])
        // So generated unique input is: interviewerId_interviewId
        interviewerId_interviewId: {
          interviewerId: userId,
          interviewId: dto.interviewId,
        },
      },
      create: {
        tenantId,
        interviewerId: userId,
        interviewId: dto.interviewId,
        rating: dto.rating,
        criteria: dto.criteria || {},
        comments: dto.comments,
      },
      update: {
        rating: dto.rating,
        criteria: dto.criteria || {},
        comments: dto.comments,
      },
    });

    // 4. Update Interview Aggregate
    const interviewStats = await this.prisma.feedback.aggregate({
      where: { interviewId: dto.interviewId },
      _avg: { rating: true },
    });

    await this.prisma.interview.update({
      where: { id: dto.interviewId },
      data: {
        avgRating: interviewStats._avg.rating,
        hasFeedback: true,
      },
    });

    // 5. Update Candidate Aggregate
    const candidateStats = await this.prisma.feedback.aggregate({
      where: { interview: { candidateId: interview.candidateId } },
      _avg: { rating: true },
    });

    await this.prisma.candidate.update({
      where: { id: interview.candidateId },
      data: {
        overallScore: candidateStats._avg.rating,
        lastFeedbackAt: new Date(),
      },
    });

    // 6. Audit Log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'FEEDBACK_SUBMIT',
        metadata: { interviewId: dto.interviewId, rating: dto.rating },
      },
    });

    // Emit event
    this.eventEmitter.emit('feedback.created', {
      tenantId,
      feedbackId: feedback.id,
      candidateId: interview.candidateId,
      overallScore: dto.rating, // Simplification: using rating as score
    });

    return feedback;
  }

  async getInterviewFeedback(
    tenantId: string,
    interviewId: string,
    limit = 50,
  ) {
    const feedback = await this.prisma.feedback.findMany({
      where: { tenantId, interviewId },
      take: Math.min(limit, 100),
      orderBy: { createdAt: 'desc' },
    });
    return feedback || [];
  }
}
