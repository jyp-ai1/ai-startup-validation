'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle2, Circle, XCircle } from 'lucide-react';

import type { OpsDashboardStats } from '@/lib/analytics/types';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

type AdminReleaseReadinessPanelProps = {
  stats: OpsDashboardStats;
};

const STATUS_ICON = {
  PASS: CheckCircle2,
  PENDING: Circle,
  FAIL: XCircle,
} as const;

export function AdminReleaseReadinessPanel({ stats }: AdminReleaseReadinessPanelProps) {
  const t = useTranslations('operations.releaseReadiness');
  const readiness = stats.releaseReadiness;

  if (!readiness) return null;

  return (
    <Card className="border-emerald-300/50 bg-gradient-to-br from-emerald-50/40 to-background dark:border-emerald-900 dark:from-emerald-950/20">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{t('title')}</CardTitle>
          <Badge variant={readiness.overallPass ? 'default' : 'outline'}>
            {readiness.overallPass ? t('alphaReady') : t('notReady')}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {readiness.checks.map((check) => {
            const Icon = STATUS_ICON[check.status];
            return (
              <div
                key={check.id}
                className={cn(
                  'flex items-center justify-between rounded-lg border px-3 py-2 text-sm',
                  check.status === 'PASS' && 'border-emerald-200/60 bg-emerald-50/30',
                  check.status === 'FAIL' && 'border-rose-200/60 bg-rose-50/30',
                  check.status === 'PENDING' && 'border-border/50 bg-muted/20',
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon
                    className={cn(
                      'size-4',
                      check.status === 'PASS' && 'text-emerald-600',
                      check.status === 'FAIL' && 'text-rose-600',
                      check.status === 'PENDING' && 'text-muted-foreground',
                    )}
                    aria-hidden
                  />
                  {check.label}
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
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">{t('docHint')}</p>
      </CardContent>
    </Card>
  );
}
