/**
 * Calendar Provider Interface
 *
 * Abstraction for external calendar integrations (Google, Microsoft).
 * ONLY fetches busy/free time ranges - no full event sync.
 */

export interface TimeInterval {
  start: Date;
  end: Date;
}

export interface BusySlot extends TimeInterval {
  source: 'internal' | 'google' | 'microsoft';
  reason?: string;
}

export interface CalendarProviderResult {
  busySlots: BusySlot[];
  success: boolean;
  error?: string;
}

/**
 * Interface for calendar providers that fetch busy/free information.
 *
 * Implementations should:
 * - Use FreeBusy/getSchedule APIs (NOT full event sync)
 * - Handle token refresh automatically
 * - Return empty result on failure (never throw)
 */
export interface CalendarProvider {
  /**
   * Get busy time slots for a connected calendar account.
   * Returns only start/end times - no event metadata.
   *
   * @param accountId - CalendarSyncAccount ID
   * @param from - Start of date range
   * @param to - End of date range
   * @returns Busy slots with source info, or empty array on failure
   */
  getBusySlots(
    accountId: string,
    from: Date,
    to: Date,
  ): Promise<CalendarProviderResult>;

  /**
   * Check if the account's token is expired or will expire soon.
   * Used to show warnings in the UI.
   */
  isTokenExpired?(accountId: string): Promise<boolean>;
}

