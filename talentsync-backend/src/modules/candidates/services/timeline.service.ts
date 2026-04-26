import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

export interface TimelineEvent {
  id: string;
  type:
    | 'STAGE_CHANGE'
    | 'NOTE_ADDED'
    | 'INTERVIEW_SCHEDULED'
    | 'INTERVIEW_COMPLETED'
    | 'EMAIL_SENT'
    | 'SMS_SENT'
    | 'WHATSAPP_SENT'
    | 'DOCUMENT_UPLOADED'
    | 'CANDIDATE_CREATED';
  timestamp: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  actor?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

@Injectable()
export class TimelineService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get unified timeline for a candidate
   * Aggregates: stage changes, notes, interviews, messages, documents
   */
  async getCandidateTimeline(
    tenantId: string,
    candidateId: string,
  ): Promise<TimelineEvent[]> {
    // Verify candidate exists
    const candidate = await this.prisma.candidate.findFirst({
      where: { id: candidateId, tenantId },
    });
    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    const events: TimelineEvent[] = [];

    // 1. Add candidate creation event
    events.push({
      id: `created-${candidate.id}`,
      type: 'CANDIDATE_CREATED',
      timestamp: candidate.createdAt.toISOString(),
      title: 'Candidate created',
      description: candidate.source ? `Source: ${candidate.source}` : undefined,
      actor: null,
    });

    // 2. Get stage history
    const stageHistory = await this.prisma.candidateStageHistory.findMany({
      where: { tenantId, candidateId },
      orderBy: { createdAt: 'desc' },
    });

    // Get actor details for stage history
    const stageActorIds = [
      ...new Set(stageHistory.filter((h) => h.actorId).map((h) => h.actorId!)),
    ];
    const stageActors =
      stageActorIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: stageActorIds } },
            select: { id: true, name: true, email: true },
          })
        : [];
    const stageActorMap = new Map(stageActors.map((a) => [a.id, a]));

    for (const history of stageHistory) {
      const rawActor = history.actorId
        ? stageActorMap.get(history.actorId)
        : null;
      const actor = rawActor
        ? {
            id: rawActor.id,
            name: rawActor.name || 'Unknown',
            email: rawActor.email,
          }
        : null;
      events.push({
        id: history.id,
        type: 'STAGE_CHANGE',
        timestamp: history.createdAt.toISOString(),
        title: 'Stage updated',
        description: `${this.formatStageName(history.previousStage)} → ${this.formatStageName(history.newStage)}`,
        metadata: {
          previousStage: history.previousStage,
          newStage: history.newStage,
          triggeredBy: history.triggeredBy,
          reason: history.reason,
        },
        actor,
      });
    }

    // 3. Get notes
    const notes = await this.prisma.candidateNote.findMany({
      where: { tenantId, candidateId },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const note of notes) {
      events.push({
        id: note.id,
        type: 'NOTE_ADDED',
        timestamp: note.createdAt.toISOString(),
        title: 'Note added',
        description: this.truncateText(note.content, 100),
        actor: note.author
          ? {
              id: note.author.id,
              name: note.author.name || 'Unknown',
              email: note.author.email,
            }
          : null,
      });
    }

    // 4. Get interviews
    const interviews = await this.prisma.interview.findMany({
      where: { tenantId, candidateId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    for (const interview of interviews) {
      const isCompleted = interview.status === 'COMPLETED';
      events.push({
        id: interview.id,
        type: isCompleted ? 'INTERVIEW_COMPLETED' : 'INTERVIEW_SCHEDULED',
        timestamp: interview.createdAt.toISOString(),
        title: isCompleted ? 'Interview completed' : 'Interview scheduled',
        description: `${interview.stage} - ${new Date(interview.date).toLocaleDateString()} at ${new Date(interview.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        metadata: {
          interviewId: interview.id,
          stage: interview.stage,
          date: interview.date,
          status: interview.status,
        },
        actor: null,
      });
    }

    // 5. Get message logs (emails, SMS, WhatsApp)
    const messages = await this.prisma.messageLog.findMany({
      where: {
        tenantId,
        recipientId: candidateId,
        recipientType: 'CANDIDATE',
        status: { in: ['SENT', 'DELIVERED', 'READ'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const message of messages) {
      const typeMap: Record<string, TimelineEvent['type']> = {
        EMAIL: 'EMAIL_SENT',
        SMS: 'SMS_SENT',
        WHATSAPP: 'WHATSAPP_SENT',
      };
      events.push({
        id: message.id,
        type: typeMap[message.channel] || 'EMAIL_SENT',
        timestamp:
          message.sentAt?.toISOString() || message.createdAt.toISOString(),
        title: `${message.channel.charAt(0) + message.channel.slice(1).toLowerCase()} sent`,
        description: message.subject || this.truncateText(message.body, 60),
        metadata: {
          channel: message.channel,
          status: message.status,
        },
        actor: null,
      });
    }

    // 6. Get document uploads
    const documents = await this.prisma.fileObject.findMany({
      where: {
        tenantId,
        linkedType: 'candidate',
        linkedId: candidateId,
        status: 'active',
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const doc of documents) {
      events.push({
        id: doc.id,
        type: 'DOCUMENT_UPLOADED',
        timestamp: doc.createdAt.toISOString(),
        title: 'Document uploaded',
        description: doc.filename,
        metadata: {
          filename: doc.filename,
          mimeType: doc.mimeType,
        },
        actor: null,
      });
    }

    // Sort all events by timestamp descending
    events.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return events;
  }

  private formatStageName(stage: string): string {
    return stage
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    // Strip HTML tags
    const plainText = text.replace(/<[^>]*>/g, '');
    if (plainText.length <= maxLength) return plainText;
    return plainText.substring(0, maxLength) + '...';
  }
}
