import { getRequestConfig } from 'next-intl/server';

import { loadMessages, isAppLocale, DEFAULT_LOCALE, type AppLocale } from '@repo/i18n';
import { cookies } from 'next/headers';

export default getRequestConfig(async ({ requestLocale }) => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;

  let locale = await requestLocale;
  if (cookieLocale && isAppLocale(cookieLocale)) {
    locale = cookieLocale;
  }
  if (!locale || !isAppLocale(locale)) {
    locale = DEFAULT_LOCALE;
  }

  const resolvedLocale = locale as AppLocale;

  return {
    locale: resolvedLocale,
    messages: await loadMessages(resolvedLocale),
  };
});
