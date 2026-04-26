import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { EmailService } from '../../email/email.service';

@Processor('user-invitations')
@Injectable()
export class InvitationEmailProcessor extends WorkerHost {
  private logger = new Logger(InvitationEmailProcessor.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {
    super();
  }

  async process(job: Job) {
    const { tenantId, userId, email, name, invitationLink } = job.data;

    this.logger.log(`Processing invitation email for ${email}`);

    try {
      // Use EmailService to send the email
      // template 'invite' expects context: { name, link }
      await this.emailService.sendMail(tenantId, {
        to: email,
        template: 'invite',
        context: {
          name,
          link: invitationLink,
          // Generic tenant name fallback if not provided in job data,
          // though ideally job should provide it or strict template might require it.
          // Assuming 'invite.hbs' just needs name and link for now based on typical patterns.
        },
      });

      this.logger.log(`Invitation email sent to ${email}`);

      // Create audit log for email sent
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'email.invitation.sent',
          metadata: {
            email,
            name,
            invitationLink: invitationLink.replace(/token=.*/, 'token=***'), // Redact token
          },
        },
      });

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to send invitation email to ${email}`,
        error.stack,
      );

      // Log failure in audit log
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'email.invitation.failed',
          metadata: {
            email,
            error: error.message,
          },
        },
      });

      throw error; // Retry job
    }
  }
}
