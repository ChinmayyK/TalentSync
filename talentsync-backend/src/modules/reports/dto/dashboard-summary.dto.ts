import { ApiProperty } from '@nestjs/swagger';

export class DashboardSummaryDto {
  @ApiProperty({
    description: 'Total number of active candidates int the pipeline',
  })
  totalCandidates: number;

  @ApiProperty({
    description: 'Number of interviews currently scheduled/active',
  })
  activeInterviews: number;

  @ApiProperty({ description: 'Number of offers extended' })
  offersMade: number;

  @ApiProperty({ description: 'Number of candidates hired' })
  hires: number;
}
