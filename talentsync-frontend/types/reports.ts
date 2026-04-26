export interface ReportFilters {
  dateRange: 'today' | '7days' | '30days' | '90days' | 'custom';
  startDate?: Date;
  endDate?: Date;
  recruiterId?: string;
  stage?: string;
  source?: string;
  role?: string;
}

export interface ReportKPI {
  label: string;
  value: number | string;
  trend: number;
  trendLabel: string;
  icon: string;
}

export interface FunnelStage {
  stage: string;
  label: string;
  count: number;
  percentage: number;
  dropOff: number;
}

export interface TimeToHireDataPoint {
  date: string;
  days: number;
}

export interface StageDurationData {
  stage: string;
  avgDays: number;
}

export interface RecruiterLoadData {
  recruiter: string;
  interviews: number;
  completed: number;
  pending: number;
}

export interface OfferAcceptanceData {
  status: string;
  count: number;
  fill: string;
  [key: string]: any;
}

export interface SourcePerformanceRow {
  source: string;
  candidatesAdded: number;
  interviewsScheduled: number;
  offers: number;
  acceptances: number;
  conversionRate: number;
}

export interface ReportsData {
  kpis: ReportKPI[];
  funnel: FunnelStage[];
  timeToHire: TimeToHireDataPoint[];
  stageDuration: StageDurationData[];
  recruiterLoad: RecruiterLoadData[];
  offerAcceptance: OfferAcceptanceData[];
  sourcePerformance: SourcePerformanceRow[];
}
