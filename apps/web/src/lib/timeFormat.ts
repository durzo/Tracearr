/**
 * Time format preference management (12-hour vs 24-hour).
 * Stored in localStorage.
 */

const TIME_FORMAT_STORAGE_KEY = 'tracearr_time_format';

export type TimeFormat = '12h' | '24h';

/**
 * Get the current time format preference.
 * Returns '12h' if no preference is stored.
 */
export function getTimeFormat(): TimeFormat {
  try {
    const stored = localStorage.getItem(TIME_FORMAT_STORAGE_KEY);
    if (stored === '12h' || stored === '24h') return stored;
  } catch {
    // Fails in private browsing or when storage is disabled
  }
  return '12h';
}

/**
 * Set the time format preference and persist it.
 */
export function setTimeFormat(format: TimeFormat): void {
  try {
    localStorage.setItem(TIME_FORMAT_STORAGE_KEY, format);
  } catch {
    // Fails in private browsing or when quota exceeded
  }
}

/**
 * Get the date-fns format string for time only.
 * 12h: 'h:mm a' (e.g., "3:30 PM")
 * 24h: 'H:mm' (e.g., "15:30")
 */
export function getTimeFormatString(): 'h:mm a' | 'H:mm' {
  return getTimeFormat() === '24h' ? 'H:mm' : 'h:mm a';
}

/**
 * Get the date-fns format string for date + time.
 * 12h: 'MMM d, h:mm a' (e.g., "Jan 2, 3:30 PM")
 * 24h: 'MMM d, H:mm' (e.g., "Jan 2, 15:30")
 */
export function getDateTimeFormatString(): 'MMM d, h:mm a' | 'MMM d, H:mm' {
  return getTimeFormat() === '24h' ? 'MMM d, H:mm' : 'MMM d, h:mm a';
}

/**
 * Get the date-fns format string for full date + time with seconds.
 * 12h: 'MMM d, yyyy, h:mm:ss a' (e.g., "Feb 13, 2026, 3:30:45 PM")
 * 24h: 'MMM d, yyyy, H:mm:ss' (e.g., "Feb 13, 2026, 15:30:45")
 */
export function getFullDateTimeFormatString(): string {
  return getTimeFormat() === '24h' ? 'MMM d, yyyy, H:mm:ss' : 'MMM d, yyyy, h:mm:ss a';
}

/**
 * Get the hour12 boolean for Intl.DateTimeFormat / toLocaleTimeString.
 */
export function getHour12(): boolean {
  return getTimeFormat() !== '24h';
}
