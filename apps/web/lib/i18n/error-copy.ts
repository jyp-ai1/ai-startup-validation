import { cookies } from 'next/headers';

import {
  DEFAULT_LOCALE,
  isAppLocale,
  loadMessages,
  type AppLocale,
} from '@repo/i18n';

type ErrorCopy = {
  title: string;
  description: string;
  action: string;
  secondary?: string;
};

function resolve(messages: Record<string, unknown>, key: string): string | undefined {
  const value = key.split('.').reduce<unknown>((cur, part) => {
    if (cur && typeof cur === 'object' && part in (cur as Record<string, unknown>)) {
      return (cur as Record<string, unknown>)[part];
    }
    return undefined;
  }, messages);
  return typeof value === 'string' ? value : undefined;
}

export async function getErrorCopy(
  keys: { title: string; description: string; action: string; secondary?: string },
): Promise<ErrorCopy> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const locale: AppLocale =
    cookieLocale && isAppLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
  const messages = (await loadMessages(locale)) as Record<string, unknown>;

  return {
    title: resolve(messages, keys.title) ?? keys.title,
    description: resolve(messages, keys.description) ?? keys.description,
    action: resolve(messages, keys.action) ?? keys.action,
    secondary: keys.secondary ? resolve(messages, keys.secondary) ?? keys.secondary : undefined,
  };
}
