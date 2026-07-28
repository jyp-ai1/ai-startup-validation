'use client';

import { useTranslations } from 'next-intl';
import { HeartPulse } from 'lucide-react';

import type { OpsDashboardStats } from '@/lib/analytics/types';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

type AdminReleaseHealthPanelProps = {
  stats: OpsDashboardStats;
};

export function AdminReleaseHealthPanel({ stats }: AdminReleaseHealthPanelProps) {
  const t = useTranslations('operations.releaseHealth');
  const health = stats.releaseHealth;

  if (!health) return null;

  return (
    <Card className="border-sky-300/50 bg-gradient-to-br from-sky-50/40 to-background dark:border-sky-900 dark:from-sky-950/20">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <HeartPulse className="size-4 text-sky-700 dark:text-sky-400" aria-hidden />
            {t('title')}
          </CardTitle>
          <Badge variant={health.overallPass ? 'default' : 'outline'}>
            {health.overallPass ? t('overallPass') : t('overallPending')}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {health.checks.map((check) => (
            <div
              key={check.id}
              className={cn(
                'flex items-center justify-between rounded-lg border px-3 py-2 text-sm',
                check.status === 'PASS' && 'border-emerald-200/60 bg-emerald-50/30',
                check.status === 'FAIL' && 'border-rose-200/60 bg-rose-50/30',
                check.status === 'PENDING' && 'border-border/50 bg-muted/20',
              )}
            >
              <span>{check.label}</span>
              <span className="flex items-center gap-2 tabular-nums">
                <span className="font-semibold">
                  {check.current} / {check.target}
                </span>
                <Badge
                  variant={
                    check.status === 'PASS'
                      ? 'default'
                      : check.status === 'FAIL'
                        ? 'destructive'
                        : 'outline'
                  }
                >
                  {check.status}
                </Badge>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
