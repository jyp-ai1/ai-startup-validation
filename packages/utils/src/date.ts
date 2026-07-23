/** Format a date to ISO string (UTC). */
export function toISOString(date: Date): string {
  return date.toISOString();
}

/** Parse an ISO date string safely. Returns null if invalid. */
export function parseISO(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Check if a value is a valid Date object. */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

/** Add days to a date. */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Locale-aware calendar date (e.g. Jul 23, 2026 / 2026년 7월 23일). */
export function formatLocaleDate(
  date: Date,
  locale = 'ko',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  },
): string {
  return new Intl.DateTimeFormat(locale, options).format(date);
}

/** Locale-aware number formatting. */
export function formatLocaleNumber(
  value: number,
  locale = 'ko',
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/** Relative time using Intl (locale-aware). */
export function formatRelativeTime(
  date: Date,
  now: Date = new Date(),
  locale = 'ko',
): string {
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (Math.abs(diffSec) < 60) return rtf.format(0, 'second');
  if (Math.abs(diffMin) < 60) return rtf.format(-diffMin, 'minute');
  if (Math.abs(diffHour) < 24) return rtf.format(-diffHour, 'hour');
  if (Math.abs(diffDay) < 30) return rtf.format(-diffDay, 'day');

  return formatLocaleDate(date, locale);
}

/** Start of day in local timezone. */
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/** End of day in local timezone. */
export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}
