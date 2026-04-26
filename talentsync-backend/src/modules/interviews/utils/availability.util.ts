export class AvailabilityUtil {
  /**
   * Checks if two time ranges overlap.
   * Ranges are [start, end)
   */
  static rangesOverlap(
    startA: Date,
    endA: Date,
    startB: Date,
    endB: Date,
  ): boolean {
    // Overlap if (StartA < EndB) AND (EndA > StartB)
    return startA < endB && endA > startB;
  }

  /**
   * Normalize date string to Date object.
   * If functionality to parse tenant timezone needed, use date-fns-tz here.
   * For now assumes standard ISO input from FE which is usually UTC or full ISO.
   */
  static parseDate(iso: string): Date {
    return new Date(iso);
  }
}
