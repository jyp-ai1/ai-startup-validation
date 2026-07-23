'use client';

import { Globe } from 'lucide-react';
import {
  LAUNCH_LOCALES,
  LOCALE_DROPDOWN_LABELS,
  localeToShortCode,
  type AppLocale,
  type LaunchLocale,
} from '@repo/i18n/config';
import { useLocale, useTranslations } from 'next-intl';

import { trackEvent } from '@/lib/analytics/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { usePathname, useRouter } from '@/i18n/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

const LOCALE_COOKIE = 'NEXT_LOCALE';
const LOCALE_MAX_AGE = 60 * 60 * 24 * 365;

const LOCALE_MENU_CLASS =
  'z-[200] border border-border bg-white text-foreground shadow-xl dark:border-gray-800 dark:bg-gray-950 dark:text-gray-50';

export function LocaleSwitcher() {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('common');

  const activeLocale = (LAUNCH_LOCALES as readonly string[]).includes(locale)
    ? (locale as LaunchLocale)
    : LAUNCH_LOCALES[0];

  function onChange(nextLocale: string) {
    if (nextLocale === locale || !nextLocale) return;

    trackEvent(ANALYTICS_EVENTS.languageChange, {
      language: nextLocale,
      screen: typeof window !== 'undefined' ? window.location.pathname : undefined,
    });

    document.cookie = `${LOCALE_COOKIE}=${nextLocale}; path=/; max-age=${LOCALE_MAX_AGE}; SameSite=Lax`;
    router.replace(pathname, { locale: nextLocale as AppLocale });
    window.location.reload();
  }

  return (
    <Select value={activeLocale} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          'h-8 w-[4.5rem] shrink-0 gap-1 border-border bg-background px-2 shadow-sm',
          'text-xs font-semibold uppercase',
        )}
        aria-label={t('language')}
      >
        <Globe className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <SelectValue placeholder={localeToShortCode(activeLocale)}>
          {localeToShortCode(activeLocale)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent position="popper" className={LOCALE_MENU_CLASS}>
        {LAUNCH_LOCALES.map((code) => (
          <SelectItem key={code} value={code} className="cursor-pointer py-2">
            {LOCALE_DROPDOWN_LABELS[code]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
