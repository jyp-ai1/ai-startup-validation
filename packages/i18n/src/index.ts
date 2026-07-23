import type { AppLocale } from './config';
import { mergeMessages } from './merge-messages';

export {
  BETA_LOCALES,
  DEFAULT_LOCALE,
  LAUNCH_LOCALES,
  LOCALES,
  LOCALE_DROPDOWN_LABELS,
  LOCALE_ISO_CODES,
  LOCALE_LABELS,
  LOCALE_SHORT_CODES,
  OPEN_GRAPH_LOCALES,
  isAppLocale,
  isBetaLocale,
  isLaunchLocale,
  localeToIsoCode,
  localeToShortCode,
  type AppLocale,
  type BetaLocale,
  type LaunchLocale,
} from './config';

export { mergeMessages, humanizeMessageKey } from './merge-messages';

export type Messages = typeof import('./messages/ko.json');

async function importLocaleFile(locale: AppLocale): Promise<Partial<Messages>> {
  switch (locale) {
    case 'ko':
      return (await import('./messages/ko.json')).default;
    case 'en':
      return (await import('./messages/en.json')).default;
    case 'ja':
      return (await import('./messages/ja.json')).default as unknown as Partial<Messages>;
    case 'zh-CN':
      return (await import('./messages/zh-CN.json')).default as unknown as Partial<Messages>;
    case 'zh-TW':
      return (await import('./messages/zh-TW.json')).default as unknown as Partial<Messages>;
    case 'es':
      return (await import('./messages/es.json')).default as unknown as Partial<Messages>;
    case 'fr':
      return (await import('./messages/fr.json')).default as unknown as Partial<Messages>;
    case 'de':
      return (await import('./messages/de.json')).default as unknown as Partial<Messages>;
    case 'pt':
      return (await import('./messages/pt.json')).default as unknown as Partial<Messages>;
    case 'vi':
      return (await import('./messages/vi.json')).default as unknown as Partial<Messages>;
    case 'id':
      return (await import('./messages/id.json')).default as unknown as Partial<Messages>;
    default:
      return (await import('./messages/ko.json')).default;
  }
}

/**
 * Load messages with fallback chain: locale → English → (runtime humanize).
 * Korean and English are fully maintained; other locales merge over English.
 */
export async function loadMessages(locale: AppLocale): Promise<Messages> {
  const en = (await import('./messages/en.json')).default;

  if (locale === 'en') {
    return en;
  }

  const localeMessages = await importLocaleFile(locale);
  return mergeMessages(en, localeMessages) as Messages;
}
