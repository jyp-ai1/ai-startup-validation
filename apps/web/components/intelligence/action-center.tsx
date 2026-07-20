'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock3, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { DashboardNextAction } from '@/features/dashboard/types';

type ActionCenterProps = {
  actions: DashboardNextAction[];
};

const ACTION_META: Record<string, { impact: number; weeks: number }> = {
  'voc-volume': { impact: 8, weeks: 2 },
  competitors: { impact: 6, weeks: 1 },
  'evidence-high': { impact: 10, weeks: 3 },
  research: { impact: 5, weeks: 1 },
  validation: { impact: 12, weeks: 0 },
};

export function ActionCenter({ actions }: ActionCenterProps) {
  const t = useTranslations();
  const pending = actions.filter((a) => !a.completed).slice(0, 3);

  if (pending.length === 0) {
    return (
      <div className="ll-consulting-card border-emerald-500/25 bg-emerald-500/5">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="size-6 text-emerald-600" />
          <p className="text-lg font-medium">{t('intelligence.action.allComplete')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pending.map((action, index) => {
        const meta = ACTION_META[action.id] ?? { impact: 5, weeks: 1 };

        return (
          <Link
            key={action.id}
            href={action.href}
            className="ll-consulting-card-hover group flex flex-col gap-4 sm:flex-row sm:items-center"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
              {index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
                {t('intelligence.action.priority', { n: index + 1 })}
              </p>
              <p className="mt-1 text-[18px] font-semibold tracking-tight group-hover:text-primary">
                {t(action.labelKey)}
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-[13px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <TrendingUp className="size-3.5 text-emerald-600" />
                  {t('intelligence.action.scoreImpact', { points: meta.impact })}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="size-3.5" />
                  {meta.weeks === 0
                    ? t('intelligence.action.timeDays')
                    : t('intelligence.action.timeWeeks', { weeks: meta.weeks })}
                </span>
                <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 font-medium text-amber-800 dark:text-amber-400">
                  {t('intelligence.action.statusPending')}
                </span>
              </div>
            </div>
            <ArrowRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
          </Link>
        );
      })}
    </div>
  );
}
