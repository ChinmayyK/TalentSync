// Queue names for Communication Module
export const COMMUNICATION_QUEUES = {
  EMAIL: 'email-queue',
  WHATSAPP: 'whatsapp-queue',
  SMS: 'sms-queue',
  AUTOMATION: 'automation-queue',
  SCHEDULER: 'scheduler-queue',
  DLQ: 'communication-dlq',
} as const;

// Default retry configuration
export const QUEUE_RETRY_CONFIG = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 1000, // 1 second base delay
  },
};

// Job interface for message sending
export interface MessageJobData {
  messageLogId: string;
  tenantId: string;
  channel: 'EMAIL' | 'WHATSAPP' | 'SMS';
  recipientEmail?: string;
  recipientPhone?: string;
  subject?: string;
  body: string;
  templateId?: string;
  context?: Record<string, any>;
}

// Job interface for automation triggers
export interface AutomationJobData {
  tenantId: string;
  trigger: string;
  entityId: string;
  entityType: 'INTERVIEW' | 'CANDIDATE' | 'FEEDBACK';
  data: Record<string, any>;
}

// Job interface for delivery receipts
export interface ReceiptJobData {
  provider: 'whatsapp' | 'ses' | 'twilio';
  externalId: string;
  status: 'delivered' | 'read' | 'failed' | 'bounced';
  timestamp: string;
  metadata?: Record<string, any>;
}
