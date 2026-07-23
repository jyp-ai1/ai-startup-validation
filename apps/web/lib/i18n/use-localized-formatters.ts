'use client';

import { useLocale } from 'next-intl';

import { formatLocaleDate, formatLocaleNumber, formatRelativeTime } from '@repo/utils/date';

/** Locale-aware date/number helpers bound to the active UI locale. */
export function useLocalizedFormatters() {
  const locale = useLocale();

  return {
    formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) =>
      formatLocaleDate(date, locale, options),
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
      formatLocaleNumber(value, locale, options),
    formatRelative: (date: Date, now?: Date) => formatRelativeTime(date, now, locale),
  };
}
