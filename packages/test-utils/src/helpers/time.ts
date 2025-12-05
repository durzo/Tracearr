/**
 * Time Manipulation Helpers for Testing
 *
 * Utilities for working with dates, times, and durations in tests.
 */

/**
 * Create a date relative to now
 */
export function relativeDate(
  offset: number,
  unit: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' = 'seconds'
): Date {
  const now = new Date();
  const multipliers = {
    seconds: 1000,
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
    weeks: 7 * 24 * 60 * 60 * 1000,
  };

  return new Date(now.getTime() + offset * multipliers[unit]);
}

/**
 * Convenience helpers for common relative dates
 */
export const time = {
  now: () => new Date(),

  // Past
  secondsAgo: (n: number) => relativeDate(-n, 'seconds'),
  minutesAgo: (n: number) => relativeDate(-n, 'minutes'),
  hoursAgo: (n: number) => relativeDate(-n, 'hours'),
  daysAgo: (n: number) => relativeDate(-n, 'days'),
  weeksAgo: (n: number) => relativeDate(-n, 'weeks'),

  // Future
  inSeconds: (n: number) => relativeDate(n, 'seconds'),
  inMinutes: (n: number) => relativeDate(n, 'minutes'),
  inHours: (n: number) => relativeDate(n, 'hours'),
  inDays: (n: number) => relativeDate(n, 'days'),
  inWeeks: (n: number) => relativeDate(n, 'weeks'),

  // Specific points
  yesterday: () => relativeDate(-1, 'days'),
  tomorrow: () => relativeDate(1, 'days'),
  lastWeek: () => relativeDate(-1, 'weeks'),
  nextWeek: () => relativeDate(1, 'weeks'),

  // Start/end of day
  startOfToday: () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  },
  endOfToday: () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  },
};

/**
 * Create a timestamp for database seeding
 */
export function timestamp(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Create a date at a specific time today
 */
export function todayAt(hours: number, minutes = 0, seconds = 0): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, seconds);
}

/**
 * Create a date at a specific time on a given date
 */
export function dateAt(
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0,
  seconds = 0
): Date {
  return new Date(year, month - 1, day, hours, minutes, seconds);
}

/**
 * Duration helpers (in milliseconds)
 */
export const duration = {
  seconds: (n: number) => n * 1000,
  minutes: (n: number) => n * 60 * 1000,
  hours: (n: number) => n * 60 * 60 * 1000,
  days: (n: number) => n * 24 * 60 * 60 * 1000,
};

/**
 * Parse duration string to milliseconds
 * Supports: 30s, 5m, 2h, 1d
 */
export function parseDuration(str: string): number {
  const match = str.match(/^(\d+)(s|m|h|d)$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${str}`);
  }

  const value = match[1]!;
  const unit = match[2]!;
  const num = parseInt(value, 10);

  switch (unit) {
    case 's':
      return duration.seconds(num);
    case 'm':
      return duration.minutes(num);
    case 'h':
      return duration.hours(num);
    case 'd':
      return duration.days(num);
    default:
      throw new Error(`Unknown duration unit: ${unit}`);
  }
}

/**
 * Format milliseconds as human-readable duration
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  if (ms < 86400000) return `${(ms / 3600000).toFixed(1)}h`;
  return `${(ms / 86400000).toFixed(1)}d`;
}

/**
 * Calculate difference between two dates in specified unit
 */
export function dateDiff(
  date1: Date,
  date2: Date,
  unit: 'seconds' | 'minutes' | 'hours' | 'days' = 'seconds'
): number {
  const diffMs = date2.getTime() - date1.getTime();
  const divisors = {
    seconds: 1000,
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
  };

  return diffMs / divisors[unit];
}

/**
 * Check if a date is within a range
 */
export function isWithinRange(date: Date, start: Date, end: Date): boolean {
  const ts = date.getTime();
  return ts >= start.getTime() && ts <= end.getTime();
}

/**
 * Create a sequence of dates for time-series testing
 */
export function dateSequence(
  start: Date,
  count: number,
  interval: number,
  unit: 'seconds' | 'minutes' | 'hours' | 'days' = 'hours'
): Date[] {
  const multipliers = {
    seconds: 1000,
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
  };

  const intervalMs = interval * multipliers[unit];
  return Array.from({ length: count }, (_, i) => new Date(start.getTime() + i * intervalMs));
}

/**
 * Mock system time for tests (requires vi.useFakeTimers)
 * Returns a cleanup function
 */
export function mockTime(date: Date): () => void {
  const original = Date.now;
  const mockNow = date.getTime();

  // Override Date.now
  Date.now = () => mockNow;

  // Return cleanup function
  return () => {
    Date.now = original;
  };
}
