// Calendar interval and time range types

export interface TimeInterval {
  start: Date;
  end: Date;
}

export interface WeeklyPattern {
  dow: number; // 0 = Sunday, 1 = Monday, etc.
  start: string; // "09:00"
  end: string; // "17:00"
}

export interface TimeSlot {
  start: Date;
  end: Date;
  durationMins: number;
  participants?: SlotParticipant[];
}

export interface SlotParticipant {
  type: 'user' | 'candidate';
  id: string;
  email?: string;
  phone?: string;
  name?: string;
}

export interface AvailabilityResult {
  userId: string;
  intervals: TimeInterval[];
}

export interface MultiUserAvailabilityResult {
  individual: AvailabilityResult[];
  combined: TimeSlot[];
}

export type BusyBlockSource = 'manual' | 'calendar_sync' | 'interview';
