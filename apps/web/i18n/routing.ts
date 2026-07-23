import { defineRouting } from 'next-intl/routing';

import { DEFAULT_LOCALE, LOCALES } from '@repo/i18n/config';

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'never',
  localeDetection: false,
  localeCookie: {
    name: 'NEXT_LOCALE',
    maxAge: 60 * 60 * 24 * 365,
  },
});
