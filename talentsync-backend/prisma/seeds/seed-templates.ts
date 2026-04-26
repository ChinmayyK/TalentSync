/**
 * Communication Templates Seed
 * Seeds the MessageTemplate table with production-ready templates
 */

import { PrismaClient, Channel, TemplateCategory } from '@prisma/client';

const prisma = new PrismaClient();

interface TemplateSeed {
    name: string;
    channel: Channel;
    category: TemplateCategory;
    subject?: string;
    body: string;
    isSystem: boolean;
}

const templates: TemplateSeed[] = [
    // =====================================
    // INTERVIEW SCHEDULED
    // =====================================
    {
        name: 'Interview Scheduled - Email',
        channel: 'EMAIL',
        category: 'INTERVIEW_SCHEDULED',
        subject: 'Your interview at {{company.name}} is scheduled',
        body: `Hi {{candidate.name}},<br><br>

Your interview for the position at <b>{{company.name}}</b> has been scheduled.<br><br>

<b>Date:</b> {{interview.date}}<br>
<b>Time:</b> {{interview.time}}<br>
<b>Duration:</b> {{interview.duration}} minutes<br>
<b>Interviewer:</b> {{interviewer.name}}<br>
<b>Meeting Link:</b> <a href="{{interview.link}}">{{interview.link}}</a><br><br>

If you need to reschedule, please reply to this email.<br><br>

Best regards,<br>
{{company.name}} Hiring Team`,
        isSystem: true,
    },
    {
        name: 'Interview Scheduled - WhatsApp',
        channel: 'WHATSAPP',
        category: 'INTERVIEW_SCHEDULED',
        body: `Hi {{candidate.name}}, your interview at {{company.name}} is scheduled.

Date: {{interview.date}}
Time: {{interview.time}}
Interviewer: {{interviewer.name}}
Meeting Link: {{interview.link}}

Please join on time. Reply if you need help.`,
        isSystem: true,
    },
    {
        name: 'Interview Scheduled - SMS',
        channel: 'SMS',
        category: 'INTERVIEW_SCHEDULED',
        body: `{{candidate.name}}, your interview with {{company.name}} is scheduled on {{interview.date}} at {{interview.time}}. Link: {{interview.link}}`,
        isSystem: true,
    },

    // =====================================
    // INTERVIEW REMINDER (24h)
    // =====================================
    {
        name: 'Interview Reminder 24h - Email',
        channel: 'EMAIL',
        category: 'INTERVIEW_REMINDER',
        subject: 'Reminder: Your interview is tomorrow',
        body: `Hi {{candidate.name}},<br><br>

This is a reminder for your upcoming interview at <b>{{company.name}}</b>.<br><br>

<b>Date:</b> {{interview.date}}<br>
<b>Time:</b> {{interview.time}}<br>
<b>Meeting Link:</b> <a href="{{interview.link}}">{{interview.link}}</a><br><br>

Good luck!<br>
{{company.name}} Hiring Team`,
        isSystem: true,
    },
    {
        name: 'Interview Reminder 24h - WhatsApp',
        channel: 'WHATSAPP',
        category: 'INTERVIEW_REMINDER',
        body: `Hi {{candidate.name}}, this is a reminder for your interview at {{company.name}} scheduled on {{interview.date}} at {{interview.time}}.

Meeting link: {{interview.link}}`,
        isSystem: true,
    },
    {
        name: 'Interview Reminder 24h - SMS',
        channel: 'SMS',
        category: 'INTERVIEW_REMINDER',
        body: `Reminder: Your interview at {{company.name}} is tomorrow at {{interview.time}}. Link: {{interview.link}}`,
        isSystem: true,
    },

    // =====================================
    // INTERVIEW REMINDER (1h)
    // =====================================
    {
        name: 'Interview Reminder 1h - Email',
        channel: 'EMAIL',
        category: 'INTERVIEW_REMINDER',
        subject: 'Upcoming Interview in 1 Hour',
        body: `Hi {{candidate.name}},<br><br>

Your interview with <b>{{company.name}}</b> will begin in <b>1 hour</b>.<br><br>

<b>Meeting Link:</b> <a href="{{interview.link}}">{{interview.link}}</a><br><br>

We wish you the best!<br>
{{company.name}} Team`,
        isSystem: true,
    },
    {
        name: 'Interview Reminder 1h - WhatsApp',
        channel: 'WHATSAPP',
        category: 'INTERVIEW_REMINDER',
        body: `Hi {{candidate.name}}, your interview with {{company.name}} starts in 1 hour.
Meeting link: {{interview.link}}`,
        isSystem: true,
    },
    {
        name: 'Interview Reminder 1h - SMS',
        channel: 'SMS',
        category: 'INTERVIEW_REMINDER',
        body: `Your interview at {{company.name}} starts in 1 hour. Link: {{interview.link}}`,
        isSystem: true,
    },

    // =====================================
    // INTERVIEW RESCHEDULED
    // =====================================
    {
        name: 'Interview Rescheduled - Email',
        channel: 'EMAIL',
        category: 'INTERVIEW_RESCHEDULED',
        subject: 'Your interview has been rescheduled',
        body: `Hi {{candidate.name}},<br><br>

Your interview at <b>{{company.name}}</b> has been rescheduled.<br><br>

<b>New Date:</b> {{interview.date}}<br>
<b>New Time:</b> {{interview.time}}<br>
<b>Interviewer:</b> {{interviewer.name}}<br>
<b>Meeting Link:</b> <a href="{{interview.link}}">{{interview.link}}</a><br><br>

If this time does not work for you, please let us know.<br><br>

Regards,<br>
{{company.name}} Hiring Team`,
        isSystem: true,
    },
    {
        name: 'Interview Rescheduled - WhatsApp',
        channel: 'WHATSAPP',
        category: 'INTERVIEW_RESCHEDULED',
        body: `Hi {{candidate.name}}, your interview at {{company.name}} has been rescheduled.

New Date: {{interview.date}}
New Time: {{interview.time}}
Meeting Link: {{interview.link}}`,
        isSystem: true,
    },
    {
        name: 'Interview Rescheduled - SMS',
        channel: 'SMS',
        category: 'INTERVIEW_RESCHEDULED',
        body: `Your interview at {{company.name}} has been rescheduled to {{interview.date}} at {{interview.time}}.`,
        isSystem: true,
    },

    // =====================================
    // INTERVIEW CANCELLED
    // =====================================
    {
        name: 'Interview Cancelled - Email',
        channel: 'EMAIL',
        category: 'INTERVIEW_CANCELLED',
        subject: 'Your interview has been cancelled',
        body: `Hi {{candidate.name}},<br><br>

We regret to inform you that your interview with <b>{{company.name}}</b> has been cancelled.<br><br>

Our team may contact you soon for the next steps.<br><br>

Regards,<br>
{{company.name}} Hiring Team`,
        isSystem: true,
    },
    {
        name: 'Interview Cancelled - WhatsApp',
        channel: 'WHATSAPP',
        category: 'INTERVIEW_CANCELLED',
        body: `Hi {{candidate.name}}, your interview at {{company.name}} has been cancelled. We will be in touch with next steps.`,
        isSystem: true,
    },
    {
        name: 'Interview Cancelled - SMS',
        channel: 'SMS',
        category: 'INTERVIEW_CANCELLED',
        body: `Your interview at {{company.name}} has been cancelled. We will contact you soon.`,
        isSystem: true,
    },

    // =====================================
    // OFFER LETTER
    // =====================================
    {
        name: 'Candidate Selected - Email',
        channel: 'EMAIL',
        category: 'OFFER_LETTER',
        subject: 'Congratulations! You have been selected at {{company.name}}',
        body: `Hi {{candidate.name}},<br><br>

Congratulations! 🎉<br>
You have been selected for the position after completing all interview rounds at <b>{{company.name}}</b>.<br><br>

Our HR team will contact you shortly regarding the offer letter and next steps.<br><br>

We look forward to having you onboard!<br><br>

Warm regards,<br>
{{company.name}} Hiring Team`,
        isSystem: true,
    },
    {
        name: 'Candidate Selected - WhatsApp',
        channel: 'WHATSAPP',
        category: 'OFFER_LETTER',
        body: `Congratulations {{candidate.name}}! 🎉
You have been selected for the role at {{company.name}}.

HR will contact you shortly with further details.`,
        isSystem: true,
    },
    {
        name: 'Candidate Selected - SMS',
        channel: 'SMS',
        category: 'OFFER_LETTER',
        body: `Congrats {{candidate.name}}! You have been selected at {{company.name}}. HR will contact you soon.`,
        isSystem: true,
    },

    // =====================================
    // FEEDBACK REQUEST
    // =====================================
    {
        name: 'Feedback Request - Email',
        channel: 'EMAIL',
        category: 'FEEDBACK_REQUEST',
        subject: 'Feedback requested for candidate: {{candidate.name}}',
        body: `Hi {{interviewer.name}},<br><br>

Please submit your feedback for the interview with <b>{{candidate.name}}</b>.<br><br>

<b>Feedback Link:</b> <a href="{{feedback.link}}">{{feedback.link}}</a><br><br>

Thank you,<br>
{{company.name}} Hiring Team`,
        isSystem: true,
    },
    {
        name: 'Feedback Request - WhatsApp',
        channel: 'WHATSAPP',
        category: 'FEEDBACK_REQUEST',
        body: `Hi {{interviewer.name}}, please submit your interview feedback for {{candidate.name}}.
Link: {{feedback.link}}`,
        isSystem: true,
    },
    {
        name: 'Feedback Request - SMS',
        channel: 'SMS',
        category: 'FEEDBACK_REQUEST',
        body: `Please submit your feedback for {{candidate.name}}. Link: {{feedback.link}}`,
        isSystem: true,
    },

    // =====================================
    // CUSTOM (Rejection)
    // =====================================
    {
        name: 'Application Rejected - Email',
        channel: 'EMAIL',
        category: 'CUSTOM',
        subject: 'Update on your interview with {{company.name}}',
        body: `Hi {{candidate.name}},<br><br>

Thank you for interviewing with <b>{{company.name}}</b>.<br>
After careful consideration, we will not be moving forward with your application at this time.<br><br>

We appreciate your interest and wish you the best in your future endeavors.<br><br>

Warm regards,<br>
{{company.name}} Hiring Team`,
        isSystem: true,
    },
    {
        name: 'Application Rejected - WhatsApp',
        channel: 'WHATSAPP',
        category: 'CUSTOM',
        body: `Hi {{candidate.name}}, thank you for interviewing with {{company.name}}.
Unfortunately, you were not selected at this time.
We wish you the best ahead.`,
        isSystem: true,
    },
    {
        name: 'Application Rejected - SMS',
        channel: 'SMS',
        category: 'CUSTOM',
        body: `Thank you for interviewing with {{company.name}}. Unfortunately, you were not selected. Best wishes.`,
        isSystem: true,
    },

    // =====================================
    // WELCOME (Admin invite)
    // =====================================
    {
        name: 'User Invited - Email',
        channel: 'EMAIL',
        category: 'WELCOME',
        subject: 'Welcome to {{company.name}} - Set up your account',
        body: `Welcome to {{company.name}}!<br><br>

You have been invited to join TalentSync.<br>
Click below to set up your account:<br>
<a href="{{invite.link}}">{{invite.link}}</a>`,
        isSystem: true,
    },
];

export async function seedCommunicationTemplates(tenantId: string) {
    console.log('Seeding communication templates...');

    for (const template of templates) {
        await prisma.messageTemplate.upsert({
            where: {
                tenantId_name_channel_version: {
                    tenantId,
                    name: template.name,
                    channel: template.channel,
                    version: 1,
                },
            },
            update: {
                subject: template.subject,
                body: template.body,
                category: template.category,
                isSystem: template.isSystem,
            },
            create: {
                tenantId,
                name: template.name,
                channel: template.channel,
                category: template.category,
                subject: template.subject,
                body: template.body,
                isSystem: template.isSystem,
                variables: extractVariables(template.body + (template.subject || '')),
            },
        });
    }

    console.log(`Seeded ${templates.length} communication templates.`);
}

function extractVariables(text: string): string[] {
    const matches = text.match(/\{\{([^}]+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '').trim()))];
}

// If running standalone
if (require.main === module) {
    const tenantId = process.argv[2];
    if (!tenantId) {
        console.error('Usage: npx ts-node seed-templates.ts <tenantId>');
        process.exit(1);
    }
    seedCommunicationTemplates(tenantId)
        .then(() => process.exit(0))
        .catch((e) => {
            console.error(e);
            process.exit(1);
        });
}
