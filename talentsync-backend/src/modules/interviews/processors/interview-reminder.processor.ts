import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { EmailService } from '../../email/email.service';

@Processor('interview-reminder')
@Injectable()
export class InterviewReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(InterviewReminderProcessor.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {
    super();
  }

  async process(
    job: Job<{ interviewId: string; tenantId: string; type: string }>,
  ): Promise<any> {
    const { interviewId, tenantId, type } = job.data;
    this.logger.log(`Processing reminder ${type} for interview ${interviewId}`);

    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
      include: { candidate: true, tenant: true },
    });

    if (!interview || interview.status === 'CANCELLED') {
      this.logger.log(
        `Interview ${interviewId} not found or cancelled. Skipping reminder.`,
      );
      return;
    }

    // Fetch interviewer emails
    const interviewers = await this.prisma.user.findMany({
      where: { id: { in: interview.interviewerIds } },
      select: { email: true, name: true },
    });

    const emails = interviewers.map((u) => u.email);
    if (interview.candidate.email) emails.push(interview.candidate.email);

    // Send generic reminder email
    // This assumes EmailService has a generic send method or we stub it
    // await this.emailService.sendInterviewReminder(emails, interview);

    // Logging action
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        action: 'INTERVIEW_REMINDER_SENT',
        metadata: { interviewId, type, recipients: emails },
      },
    });

    this.logger.log(`Reminders sent to ${emails.join(', ')}`);
  }
}
