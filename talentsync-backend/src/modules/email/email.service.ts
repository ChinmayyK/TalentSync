import { Injectable, BadRequestException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { renderTemplate } from './utils/template.util';
import { EmailQueue } from './email.queue';
import { PrismaService } from '../../common/prisma.service';
import { createSignedLink } from './utils/token.util';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

@Injectable()
export class EmailService {
  private queue: EmailQueue;
  constructor(private prisma: PrismaService) {
    this.queue = new EmailQueue();
  }

  // Enqueue send
  async enqueue(
    tenantId: string | null,
    payload: {
      to: string;
      template: string;
      context: any;
      attachments?: any[];
    },
  ) {
    // tenantId can be null for platform messages
    return this.queue.getQueue().add('send', {
      tenantId,
      to: payload.to,
      template: payload.template,
      context: payload.context,
      attachments: payload.attachments || [],
    });
  }

  // Send immediately (used by processor). Detect tenant SMTP config and send accordingly.
  async sendMail(
    tenantId: string | null,
    opts: { to: string; template: string; context: any; attachments?: any[] },
  ) {
    const { subject, body } = renderTemplate(opts.template, opts.context);

    // If tenantId provided, prefer tenant SMTP settings (from tenant.settings.smtp)
    let transportOptions: any = null;
    if (tenantId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });
      const smtp = (tenant?.settings as any)?.smtp;
      if (!smtp || !smtp.host) {
        // fallback to global SMTP: check env
        transportOptions = this.globalSmtp();
      } else {
        transportOptions = this.smtpFromSettings(smtp);
      }
    } else {
      transportOptions = this.globalSmtp();
    }

    // Default to global if tenant specific fails/missing and tenantId was provided but fell back
    if (!transportOptions) transportOptions = this.globalSmtp();

    if (!transportOptions)
      throw new BadRequestException('No SMTP configuration available');

    // If transportOptions.type === 'ses', use AWS SES client path
    if (transportOptions.type === 'ses') {
      const client = new SESClient({ region: transportOptions.region });
      const params = {
        Destination: { ToAddresses: [opts.to] },
        Message: {
          Body: { Html: { Charset: 'UTF-8', Data: body } },
          Subject: { Charset: 'UTF-8', Data: subject },
        },
        Source: transportOptions.from,
      };
      const cmd = new SendEmailCommand(params);
      const res = await client.send(cmd);
      return res;
    }

    // nodemailer SMTP send
    const transporter = nodemailer.createTransport({
      host: transportOptions.host,
      port: Number(transportOptions.port || 587),
      secure: !!transportOptions.secure,
      auth: transportOptions.auth
        ? {
            user: transportOptions.auth.user,
            pass: transportOptions.auth.pass,
          }
        : undefined,
      tls: transportOptions.tls || undefined,
    });

    const mail = {
      from:
        transportOptions.from ||
        process.env.DEFAULT_FROM_ADDRESS ||
        'no-reply@talentsync.example',
      to: opts.to,
      subject,
      html: body,
      attachments: opts.attachments || [],
    };

    const result = await transporter.sendMail(mail);
    return result;
  }

  smtpFromSettings(smtp: any) {
    // smtp object must be stored encrypted in tenant.settings or refer to secret manager
    return {
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure || false,
      auth: smtp.username
        ? { user: smtp.username, pass: smtp.password }
        : undefined,
      from: smtp.fromAddress, // || smtp.username often
    };
  }

  globalSmtp() {
    if (process.env.EMAIL_PROVIDER === 'ses') {
      return {
        type: 'ses',
        region: process.env.AWS_REGION,
        from: process.env.SES_FROM,
      };
    }
    if (process.env.SMTP_HOST) {
      const hasAuth = process.env.SMTP_USER && process.env.SMTP_PASS;
      return {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === 'true',
        auth: hasAuth
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
        from: process.env.DEFAULT_FROM_ADDRESS,
      };
    }
    return null;
  }

  // Helpers to create onboarding link and enqueue onboarding email
  async sendOnboardingEmail(
    tenantId: string,
    to: string,
    name: string,
    tenantName: string,
    setupPayload: any,
  ) {
    const setupLink = createSignedLink(setupPayload, '24h');
    const context = { name, tenantName, setupLink };
    return this.enqueue(tenantId, { to, template: 'onboarding', context });
  }

  // Preview template (not sending)
  previewTemplate(template: string, context: any) {
    return renderTemplate(template, context);
  }
}
