'use client';

import { useTranslations } from 'next-intl';

export function V2DemoGuidedBanner() {
  const t = useTranslations('workflow.journey.workspaceShell.demo');

  return (
    <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
          {t('badge')}
        </span>
        <p className="text-sm font-medium text-foreground">{t('guidedBannerTitle')}</p>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t('guidedBannerDesc')}</p>
    </div>
  );
}
