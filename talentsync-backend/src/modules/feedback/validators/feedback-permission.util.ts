import { ForbiddenException } from '@nestjs/common';

export function ensureInterviewerCanSubmit(interview: any, userId: string) {
  if (!interview.interviewerIds.includes(userId)) {
    throw new ForbiddenException('User not assigned as interviewer');
  }
  if (interview.status === 'CANCELLED') {
    throw new ForbiddenException(
      'Cannot submit feedback on cancelled interview',
    );
  }
}
