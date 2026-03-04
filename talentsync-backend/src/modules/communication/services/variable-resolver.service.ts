/**
 * Variable Resolver Service
 * Resolves template variables for interview-related communications
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

export interface ResolvedVariables {
  candidate: {
    name: string;
    email: string;
    phone?: string;
  };
  interviewer: {
    name: string;
    email: string;
  };
  interview: {
    id: string;
    date: string;
    time: string;
    duration: number;
    stage: string;
    link?: string;
  };
  company: {
    name: string;
  };
}

@Injectable()
export class VariableResolverService {
  constructor(private prisma: PrismaService) {}

  /**
   * Resolve all variables for an interview-related message
   */
  async resolveForInterview(
    tenantId: string,
    interviewId: string,
    interviewerId?: string,
  ): Promise<ResolvedVariables> {
    const interview = await this.prisma.interview.findFirst({
      where: { id: interviewId, tenantId },
      include: { candidate: true },
    });

    if (!interview) {
      throw new Error(`Interview ${interviewId} not found`);
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    // Get primary interviewer
    let interviewer = null;
    const interviewerIdToUse = interviewerId || interview.interviewerIds[0];
    if (interviewerIdToUse) {
      interviewer = await this.prisma.user.findFirst({
        where: { id: interviewerIdToUse, tenantId },
      });
    }

    const interviewDate = new Date(interview.date);

    return {
      candidate: {
        name: interview.candidate?.name || 'Candidate',
        email: interview.candidate?.email || '',
        phone: interview.candidate?.phone || undefined,
      },
      interviewer: {
        name: interviewer?.name || 'Interviewer',
        email: interviewer?.email || '',
      },
      interview: {
        id: interview.id,
        date: interviewDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        time: interviewDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        duration: interview.durationMins,
        stage: interview.stage,
        link: interview.meetingLink || undefined,
      },
      company: {
        name: tenant?.name || 'Company',
      },
    };
  }

  /**
   * Flatten resolved variables for Handlebars template
   */
  flatten(vars: ResolvedVariables): Record<string, any> {
    return {
      'candidate.name': vars.candidate.name,
      'candidate.email': vars.candidate.email,
      'candidate.phone': vars.candidate.phone,
      'interviewer.name': vars.interviewer.name,
      'interviewer.email': vars.interviewer.email,
      'interview.date': vars.interview.date,
      'interview.time': vars.interview.time,
      'interview.duration': vars.interview.duration,
      'interview.stage': vars.interview.stage,
      'interview.link': vars.interview.link,
      'company.name': vars.company.name,
      // Also provide nested for handlebars
      candidate: vars.candidate,
      interviewer: vars.interviewer,
      interview: vars.interview,
      company: vars.company,
    };
  }
}

