'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

import { Button } from '@repo/ui';

export function V2DemoReadonlyBanner() {
  const t = useTranslations('landing.gtm.demo');

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-foreground">{t('bannerTitle')}</p>
        <p className="text-xs text-muted-foreground">{t('bannerDesc')}</p>
      </div>
      <Button asChild size="sm" className="shrink-0 gap-1.5">
        <Link href="/auth/login?next=/workspace">
          {t('bannerCta')}
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </Button>
    </div>
  );
}
