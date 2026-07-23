import { BETA_LOCALES, OPEN_GRAPH_LOCALES, type AppLocale } from '@repo/i18n/config';

/** hreflang + canonical for cookie-based locale (same URL, locale from cookie). */
export function buildLocaleAlternates(baseUrl: string, path = '') {
  const url = `${baseUrl.replace(/\/$/, '')}${path}`;

  const languages: Record<string, string> = {
    'x-default': url,
  };

  for (const locale of BETA_LOCALES) {
    languages[OPEN_GRAPH_LOCALES[locale].replace('_', '-')] = url;
  }

  return {
    canonical: url,
    languages,
  };
}

export function buildOpenGraphLocale(locale: AppLocale) {
  const primary = OPEN_GRAPH_LOCALES[locale] ?? OPEN_GRAPH_LOCALES.ko;
  const alternates = BETA_LOCALES.filter((code) => code !== locale).map(
    (code) => OPEN_GRAPH_LOCALES[code],
  );

  return {
    locale: primary,
    alternateLocale: alternates.length > 0 ? alternates : [OPEN_GRAPH_LOCALES.en],
  };
}
