// Interval math utilities for calendar availability computation

import { TimeInterval } from '../types/calendar.types';

/**
 * Sort intervals by start time
 */
export function sortIntervals(intervals: TimeInterval[]): TimeInterval[] {
  return [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Merge overlapping or adjacent intervals
 */
export function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
  if (intervals.length === 0) return [];

  const sorted = sortIntervals(intervals);
  const merged: TimeInterval[] = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    if (current.start.getTime() <= last.end.getTime()) {
      // Overlapping or adjacent - extend the last interval
      last.end = new Date(Math.max(last.end.getTime(), current.end.getTime()));
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

/**
 * Subtract busy intervals from available intervals
 * Returns the remaining free intervals
 */
export function subtractIntervals(
  available: TimeInterval[],
  busy: TimeInterval[],
): TimeInterval[] {
  if (available.length === 0) return [];
  if (busy.length === 0) return available.map((i) => ({ ...i }));

  const sortedAvailable = sortIntervals(available);
  const sortedBusy = mergeIntervals(busy);

  const result: TimeInterval[] = [];

  for (const avail of sortedAvailable) {
    let remaining: TimeInterval[] = [{ ...avail }];

    for (const block of sortedBusy) {
      const nextRemaining: TimeInterval[] = [];

      for (const interval of remaining) {
        // No overlap - block is entirely before or after
        if (
          block.end.getTime() <= interval.start.getTime() ||
          block.start.getTime() >= interval.end.getTime()
        ) {
          nextRemaining.push(interval);
          continue;
        }

        // Block starts after interval starts - keep the beginning
        if (block.start.getTime() > interval.start.getTime()) {
          nextRemaining.push({
            start: interval.start,
            end: new Date(
              Math.min(block.start.getTime(), interval.end.getTime()),
            ),
          });
        }

        // Block ends before interval ends - keep the end
        if (block.end.getTime() < interval.end.getTime()) {
          nextRemaining.push({
            start: new Date(
              Math.max(block.end.getTime(), interval.start.getTime()),
            ),
            end: interval.end,
          });
        }
      }

      remaining = nextRemaining;
    }

    result.push(...remaining);
  }

  // Filter out zero-length intervals
  return result.filter((i) => i.end.getTime() > i.start.getTime());
}

/**
 * Find intersection of multiple interval lists
 */
export function intersectIntervalLists(
  lists: TimeInterval[][],
): TimeInterval[] {
  if (lists.length === 0) return [];
  if (lists.length === 1) return lists[0].map((i) => ({ ...i }));

  let result = lists[0].map((i) => ({ ...i }));

  for (let i = 1; i < lists.length; i++) {
    result = intersectTwoLists(result, lists[i]);
    if (result.length === 0) break;
  }

  return result;
}

function intersectTwoLists(
  a: TimeInterval[],
  b: TimeInterval[],
): TimeInterval[] {
  const result: TimeInterval[] = [];
  const sortedA = sortIntervals(a);
  const sortedB = sortIntervals(b);

  let i = 0,
    j = 0;

  while (i < sortedA.length && j < sortedB.length) {
    const intervalA = sortedA[i];
    const intervalB = sortedB[j];

    const start = new Date(
      Math.max(intervalA.start.getTime(), intervalB.start.getTime()),
    );
    const end = new Date(
      Math.min(intervalA.end.getTime(), intervalB.end.getTime()),
    );

    if (start.getTime() < end.getTime()) {
      result.push({ start, end });
    }

    // Advance the pointer for the interval that ends first
    if (intervalA.end.getTime() < intervalB.end.getTime()) {
      i++;
    } else {
      j++;
    }
  }

  return result;
}

/**
 * Slice intervals into fixed-duration slots
 */
export function sliceIntoSlots(
  intervals: TimeInterval[],
  durationMins: number,
  alignToHour: boolean = true,
): TimeInterval[] {
  const slots: TimeInterval[] = [];
  const durationMs = durationMins * 60 * 1000;

  for (const interval of intervals) {
    let slotStart = new Date(interval.start);

    // Optionally align to the nearest hour/half-hour
    if (alignToHour) {
      const mins = slotStart.getMinutes();
      if (mins !== 0 && mins !== 30) {
        const alignTo = mins < 30 ? 30 : 60;
        slotStart = new Date(slotStart);
        slotStart.setMinutes(alignTo === 60 ? 0 : 30, 0, 0);
        if (alignTo === 60) {
          slotStart.setHours(slotStart.getHours() + 1);
        }
      }
    }

    while (slotStart.getTime() + durationMs <= interval.end.getTime()) {
      slots.push({
        start: new Date(slotStart),
        end: new Date(slotStart.getTime() + durationMs),
      });
      slotStart = new Date(slotStart.getTime() + durationMs);
    }
  }

  return slots;
}

/**
 * Apply buffer times to intervals (shrink them)
 */
export function applyBuffers(
  intervals: TimeInterval[],
  bufferBeforeMins: number,
  bufferAfterMins: number,
): TimeInterval[] {
  const bufferBeforeMs = bufferBeforeMins * 60 * 1000;
  const bufferAfterMs = bufferAfterMins * 60 * 1000;

  return intervals
    .map((interval) => ({
      start: new Date(interval.start.getTime() + bufferBeforeMs),
      end: new Date(interval.end.getTime() - bufferAfterMs),
    }))
    .filter((i) => i.end.getTime() > i.start.getTime());
}

/**
 * Filter slots that are after the minimum notice time
 */
export function filterByMinNotice(
  slots: TimeInterval[],
  minNoticeMins: number,
  now: Date = new Date(),
): TimeInterval[] {
  const minStartTime = new Date(now.getTime() + minNoticeMins * 60 * 1000);
  return slots.filter((slot) => slot.start.getTime() >= minStartTime.getTime());
}
