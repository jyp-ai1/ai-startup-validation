/** Supported UI locales — Korean default + 10 popular languages. */
export const LOCALES = [
  'ko',
  'en',
  'ja',
  'zh-CN',
  'zh-TW',
  'es',
  'fr',
  'de',
  'pt',
  'vi',
  'id',
] as const;

export type AppLocale = (typeof LOCALES)[number];

/** Beta public UI — only these appear in the language switcher. */
export const BETA_LOCALES = ['ko', 'en'] as const satisfies readonly AppLocale[];

export type BetaLocale = (typeof BETA_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = 'ko';

export const LOCALE_LABELS: Record<AppLocale, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  pt: 'Português',
  vi: 'Tiếng Việt',
  id: 'Bahasa Indonesia',
};

/** Header trigger — ISO 639-1 style (2 letters). */
export const LOCALE_ISO_CODES: Record<AppLocale, string> = {
  ko: 'KO',
  en: 'EN',
  ja: 'JA',
  'zh-CN': 'ZH',
  'zh-TW': 'TW',
  es: 'ES',
  fr: 'FR',
  de: 'DE',
  pt: 'PT',
  vi: 'VI',
  id: 'ID',
};

/** Dropdown — flag + native label (beta locales). */
export const LOCALE_DROPDOWN_LABELS: Record<BetaLocale, string> = {
  ko: '🇰🇷 한국어',
  en: '🇺🇸 English',
};

/** Open Graph locale tags. */
export const OPEN_GRAPH_LOCALES: Record<AppLocale, string> = {
  ko: 'ko_KR',
  en: 'en_US',
  ja: 'ja_JP',
  'zh-CN': 'zh_CN',
  'zh-TW': 'zh_TW',
  es: 'es_ES',
  fr: 'fr_FR',
  de: 'de_DE',
  pt: 'pt_BR',
  vi: 'vi_VN',
  id: 'id_ID',
};

export function isAppLocale(value: string): value is AppLocale {
  return (LOCALES as readonly string[]).includes(value);
}

export function isBetaLocale(value: string): value is BetaLocale {
  return (BETA_LOCALES as readonly string[]).includes(value);
}

export function localeToIsoCode(locale: AppLocale): string {
  return LOCALE_ISO_CODES[locale];
}
