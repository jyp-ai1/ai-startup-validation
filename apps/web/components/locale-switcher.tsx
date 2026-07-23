'use client';

import {
  BETA_LOCALES,
  LOCALE_DROPDOWN_LABELS,
  localeToIsoCode,
  type AppLocale,
  type BetaLocale,
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

type LocaleSwitcherProps = {
  /** Compact trigger shows ISO code (KO / EN) for headers. */
  variant?: 'default' | 'compact';
};

const LOCALE_COOKIE = 'NEXT_LOCALE';
const LOCALE_MAX_AGE = 60 * 60 * 24 * 365;

/** Opaque dropdown — no transparency bleed-through on landing cards. */
const LOCALE_MENU_CLASS =
  'z-[200] border border-border bg-white text-foreground shadow-xl dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100';

export function LocaleSwitcher({ variant = 'compact' }: LocaleSwitcherProps) {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('common');
  const compact = variant === 'compact';

  const activeLocale = (BETA_LOCALES as readonly string[]).includes(locale)
    ? (locale as BetaLocale)
    : BETA_LOCALES[0];

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
          'shrink-0 border-border bg-background text-xs font-semibold uppercase shadow-sm',
          compact ? 'h-8 w-[3.25rem] px-2' : 'h-8 w-[4.5rem] px-2.5',
        )}
        aria-label={t('language')}
      >
        <SelectValue placeholder={localeToIsoCode(activeLocale)}>
          {localeToIsoCode(activeLocale)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent position="popper" className={LOCALE_MENU_CLASS}>
        {BETA_LOCALES.map((code) => (
          <SelectItem key={code} value={code} className="cursor-pointer">
            {LOCALE_DROPDOWN_LABELS[code]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
