import type { AppLocale } from './config';

export {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_LABELS,
  isAppLocale,
  type AppLocale,
} from './config';

export type Messages = typeof import('./messages/ko.json');

export async function loadMessages(locale: AppLocale): Promise<Messages> {
  switch (locale) {
    case 'ko':
      return (await import('./messages/ko.json')).default;
    case 'en':
      return (await import('./messages/en.json')).default;
    case 'ja':
      return (await import('./messages/ja.json')).default;
    case 'zh-CN':
      return (await import('./messages/zh-CN.json')).default;
    case 'zh-TW':
      return (await import('./messages/zh-TW.json')).default;
    case 'es':
      return (await import('./messages/es.json')).default;
    case 'fr':
      return (await import('./messages/fr.json')).default;
    case 'de':
      return (await import('./messages/de.json')).default;
    case 'pt':
      return (await import('./messages/pt.json')).default;
    case 'vi':
      return (await import('./messages/vi.json')).default;
    case 'id':
      return (await import('./messages/id.json')).default;
    default:
      return (await import('./messages/ko.json')).default;
  }
}
