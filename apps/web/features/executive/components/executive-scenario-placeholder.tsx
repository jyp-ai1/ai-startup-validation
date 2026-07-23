'use client';

import { useTranslations } from 'next-intl';

export function ExecutiveScenarioPlaceholder() {
  const t = useTranslations('executive');

  const scenarios = ['best', 'base', 'worst'] as const;

  return (
    <section className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t('scenario.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('scenario.desc')}</p>
        </div>
        <span className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('scenario.comingSoon')}
        </span>
      </div>
      <div className="mt-5 space-y-3">
        {scenarios.map((key) => (
          <label
            key={key}
            className="flex cursor-not-allowed items-center gap-3 rounded-lg border border-border/40 bg-background/50 px-4 py-3 opacity-60"
          >
            <input type="radio" disabled name="scenario" className="size-4" />
            <span className="text-sm font-medium">{t(`scenario.${key}`)}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
