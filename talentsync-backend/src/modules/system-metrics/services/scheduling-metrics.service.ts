import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

export interface SchedulingMetrics {
  interviewsToday: number;
  rescheduledToday: number;
  cancelledToday: number;
  availabilityEngineAvgMs: number;
  avgTimeToFirstInterviewHours: number;
}

@Injectable()
export class SchedulingMetricsService {
  constructor(private prisma: PrismaService) {}

  async getMetrics(): Promise<SchedulingMetrics> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const fiveMinutesMs = 5 * 60 * 1000;

    // Get today's interview counts
    const [
      interviewsToday,
      cancelledToday,
      rescheduledToday,
      avgTimeToFirstInterview,
    ] = await Promise.all([
      // Total interviews scheduled for today
      this.prisma.interview.count({
        where: {
          date: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Cancelled interviews today
      this.prisma.interview.count({
        where: {
          status: 'CANCELLED',
          updatedAt: { gte: today },
        },
      }),

      // Rescheduled interviews (where updatedAt - createdAt > 5 minutes)
      // This uses raw query for date math
      this.prisma.$queryRaw<{ count: bigint }[]>`
                SELECT COUNT(*) as count
                FROM "Interview"
                WHERE "updatedAt" >= ${today}
                AND "updatedAt" > "createdAt" + interval '5 minutes'
                AND "status" != 'CANCELLED'
            `.then((result) => Number(result[0]?.count || 0)),

      // Average time from candidate creation to first interview
      this.prisma.$queryRaw<{ avg_hours: number }[]>`
                SELECT AVG(EXTRACT(EPOCH FROM (i."createdAt" - c."createdAt")) / 3600) as avg_hours
                FROM "Interview" i
                JOIN "Candidate" c ON i."candidateId" = c.id
                WHERE i."createdAt" >= NOW() - interval '30 days'
                AND i."createdAt" = (
                    SELECT MIN(i2."createdAt")
                    FROM "Interview" i2
                    WHERE i2."candidateId" = i."candidateId"
                )
            `.then(
        (result) => Math.round((result[0]?.avg_hours || 0) * 100) / 100,
      ),
    ]);

    return {
      interviewsToday,
      rescheduledToday,
      cancelledToday,
      // Placeholder - would need actual timing metrics from availability engine
      availabilityEngineAvgMs: 45,
      avgTimeToFirstInterviewHours: avgTimeToFirstInterview,
    };
  }
}
