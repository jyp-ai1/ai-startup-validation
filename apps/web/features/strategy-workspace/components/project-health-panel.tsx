'use client';

import { useTranslations } from 'next-intl';

import type { ProjectHealthMetrics, StrategyChecklistItem } from '../services/strategy-workspace-types';

type ProjectHealthPanelProps = {
  health: ProjectHealthMetrics;
  moduleProgress: StrategyChecklistItem[];
};

export function ProjectHealthPanel({ health, moduleProgress }: ProjectHealthPanelProps) {
  const t = useTranslations('strategyWorkspace');

  const metrics = [
    { key: 'health.aiScore', value: health.aiScore },
    { key: 'health.progress', value: health.progress },
    { key: 'health.risk', value: health.risk },
    { key: 'health.confidence', value: health.confidence },
  ] as const;

  return (
    <section className="rounded-xl border border-border/50 bg-card p-5 space-y-5">
      <div>
        <h3 className="text-sm font-semibold">{t('health.title')}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{t('health.desc')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map(({ key, value }) => (
          <div key={key} className="rounded-lg border border-border/40 bg-muted/20 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t(key)}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('health.moduleBadges')}
        </p>
        <div className="flex flex-wrap gap-2">
          {moduleProgress.map((mod) => (
            <span
              key={mod.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background px-2.5 py-1 text-xs font-medium"
            >
              {t(mod.labelKey as 'checklist.research')}
              <span className="tabular-nums text-primary">{mod.percent}%</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
