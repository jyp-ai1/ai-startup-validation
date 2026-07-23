'use client';

import { LOCALE_LABELS, type AppLocale } from '@repo/i18n/config';
import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';

import { usePathname, useRouter } from '@/i18n/navigation';

import { trackEvent } from '@/lib/analytics/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui';

type LocaleSwitcherProps = {
  /** Compact trigger for marketing header (avoids overlap with theme/login). */
  variant?: 'default' | 'compact';
};

export function LocaleSwitcher({ variant = 'default' }: LocaleSwitcherProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations('common');
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const compact = variant === 'compact';

  function onChange(nextLocale: string) {
    if (nextLocale === locale || !nextLocale) return;

    startTransition(() => {
      trackEvent(ANALYTICS_EVENTS.languageChange, {
        language: nextLocale,
        screen: pathname,
      });
      router.replace(pathname || '/', { locale: nextLocale as AppLocale });
    });
  }

  return (
    <Select value={locale} onValueChange={onChange} disabled={isPending}>
      <SelectTrigger
        className={
          compact
            ? 'h-8 w-[4.25rem] shrink-0 border-border/80 bg-background px-2 text-xs uppercase'
            : 'h-8 w-[132px] border-border/80 bg-background text-xs'
        }
        aria-label={t('language')}
      >
        <SelectValue placeholder={LOCALE_LABELS[locale]}>
          {compact ? locale.toUpperCase().replace('-', '') : LOCALE_LABELS[locale]}
        </SelectValue>
      </SelectTrigger>
      <SelectContent position="popper" className="z-[120]">
        {(Object.entries(LOCALE_LABELS) as [AppLocale, string][]).map(([code, label]) => (
          <SelectItem key={code} value={code}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
