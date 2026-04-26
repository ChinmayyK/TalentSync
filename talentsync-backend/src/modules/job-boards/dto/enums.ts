/**
 * Supported job board providers
 */
export enum JobBoardProvider {
  INDEED = 'INDEED',
  LINKEDIN = 'LINKEDIN',
  GLASSDOOR = 'GLASSDOOR',
  ZIPRECRUITER = 'ZIPRECRUITER',
}

export enum JobPostingStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CLOSED = 'CLOSED',
  FAILED = 'FAILED',
}
