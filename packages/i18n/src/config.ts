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

/** International launch — shown in the language switcher (Sprint L2.5). */
export const LAUNCH_LOCALES = ['ko', 'en', 'ja', 'zh-CN'] as const satisfies readonly AppLocale[];

/** @deprecated Use LAUNCH_LOCALES */
export const BETA_LOCALES = LAUNCH_LOCALES;

export type LaunchLocale = (typeof LAUNCH_LOCALES)[number];

/** @deprecated Use LaunchLocale */
export type BetaLocale = LaunchLocale;

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

/** Header trigger — short code (KO / EN / JP / CN). */
export const LOCALE_SHORT_CODES: Record<LaunchLocale, string> = {
  ko: 'KO',
  en: 'EN',
  ja: 'JP',
  'zh-CN': 'CN',
};

/** @deprecated Use LOCALE_SHORT_CODES */
export const LOCALE_ISO_CODES: Record<AppLocale, string> = {
  ko: 'KO',
  en: 'EN',
  ja: 'JP',
  'zh-CN': 'CN',
  'zh-TW': 'TW',
  es: 'ES',
  fr: 'FR',
  de: 'DE',
  pt: 'PT',
  vi: 'VI',
  id: 'ID',
};

/** Dropdown — flag + English label for launch locales. */
export const LOCALE_DROPDOWN_LABELS: Record<LaunchLocale, string> = {
  ko: '🇰🇷 Korean',
  en: '🇺🇸 English',
  ja: '🇯🇵 Japanese',
  'zh-CN': '🇨🇳 Chinese',
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

export function isLaunchLocale(value: string): value is LaunchLocale {
  return (LAUNCH_LOCALES as readonly string[]).includes(value);
}

/** @deprecated Use isLaunchLocale */
export function isBetaLocale(value: string): value is LaunchLocale {
  return isLaunchLocale(value);
}

export function localeToShortCode(locale: AppLocale): string {
  if (isLaunchLocale(locale)) return LOCALE_SHORT_CODES[locale];
  return LOCALE_ISO_CODES[locale];
}

/** @deprecated Use localeToShortCode */
export function localeToIsoCode(locale: AppLocale): string {
  return localeToShortCode(locale);
}
