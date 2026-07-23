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

export function LocaleSwitcher() {
  const locale = useLocale() as AppLocale;
  const t = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function onChange(nextLocale: string) {
    if (nextLocale === locale) return;

    startTransition(() => {
      document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
      trackEvent(ANALYTICS_EVENTS.languageChange, {
        language: nextLocale,
        screen: pathname,
      });
      router.replace(pathname, { locale: nextLocale as AppLocale });
      router.refresh();
    });
  }

  return (
    <Select value={locale} onValueChange={onChange} disabled={isPending}>
      <SelectTrigger className="h-8 w-[132px] border-border/80 bg-background text-xs" aria-label={t('language')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.entries(LOCALE_LABELS) as [AppLocale, string][]).map(([code, label]) => (
          <SelectItem key={code} value={code}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
