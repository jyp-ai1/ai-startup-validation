'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { ConsultantModuleStatus } from '../services/consultant-types';

type ConsultantOverviewProps = {
  modules: ConsultantModuleStatus[];
};

const STATUS_COLOR = {
  ready: 'bg-emerald-500',
  progress: 'bg-primary',
  blocked: 'bg-muted-foreground/30',
};

export function ConsultantOverview({ modules }: ConsultantOverviewProps) {
  const t = useTranslations('aiConsultant');

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t('overview.title')}
      </h3>
      <div className="space-y-2.5">
        {modules.map((mod) => (
          <div key={mod.id}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium">{t(mod.labelKey as 'modules.research')}</span>
              <span className="tabular-nums text-muted-foreground">
                {mod.id === 'DECISION' && mod.status === 'blocked'
                  ? t('modules.decisionBlocked')
                  : `${mod.percent}%`}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full transition-all', STATUS_COLOR[mod.status])}
                style={{ width: `${mod.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
