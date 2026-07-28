'use client';

import { useTranslations } from 'next-intl';
import { ArrowDown, GitBranch } from 'lucide-react';

import {
  CLOSED_ALPHA_FUNNEL_LABELS,
  CLOSED_ALPHA_FUNNEL_STEPS,
} from '@/lib/analytics/closed-alpha-funnel';
import type { OpsDashboardStats } from '@/lib/analytics/types';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

type AdminClosedAlphaFunnelPanelProps = {
  stats: OpsDashboardStats;
};

export function AdminClosedAlphaFunnelPanel({ stats }: AdminClosedAlphaFunnelPanelProps) {
  const t = useTranslations('operations.closedAlphaFunnel');
  const funnel = stats.closedAlphaFunnel;
  const drops = stats.closedAlphaDropOff ?? [];

  if (!funnel) return null;

  const maxCount = Math.max(...CLOSED_ALPHA_FUNNEL_STEPS.map((k) => funnel[k]), 1);

  return (
    <Card className="border-sky-300/40 bg-gradient-to-br from-sky-50/40 to-background dark:border-sky-900 dark:from-sky-950/20">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="size-4 text-sky-700 dark:text-sky-400" aria-hidden />
            {t('title')}
          </CardTitle>
          <Badge variant="outline">{t('subtitle')}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-0">
          {CLOSED_ALPHA_FUNNEL_STEPS.map((key, index) => {
            const count = funnel[key];
            const pctOfMax = Math.round((count / maxCount) * 100);
            const pctOfLanding =
              drops[index]?.percentOfLanding ??
              (funnel.landing > 0 ? Math.round((count / funnel.landing) * 100) : 0);
            const drop = index > 0 ? drops[index - 1] : undefined;
            const label = t(`steps.${key}`, { default: CLOSED_ALPHA_FUNNEL_LABELS[key] });

            return (
              <div key={key} className="w-full">
                <div className="flex items-center gap-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium">{label}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {pctOfLanding}% · {count}
                      </span>
                    </div>
                    <div className="relative h-3 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-sky-600 transition-all dark:bg-sky-500"
                        style={{ width: `${pctOfMax}%` }}
                      />
                    </div>
                    {drop && drop.dropPercent > 0 ? (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <ArrowDown className="size-3" aria-hidden />
                        {t('drop', { percent: drop.dropPercent })}
                      </p>
                    ) : null}
                  </div>
                </div>
                {index < CLOSED_ALPHA_FUNNEL_STEPS.length - 1 ? (
                  <div className="flex justify-center py-0.5" aria-hidden>
                    <span className={cn('text-muted-foreground/60')}>↓</span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
