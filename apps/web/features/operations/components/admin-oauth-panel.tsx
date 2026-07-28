'use client';

import { useTranslations } from 'next-intl';
import { KeyRound, ShieldCheck } from 'lucide-react';

import type { OpsDashboardStats } from '@/lib/analytics/types';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

type AdminOAuthPanelProps = {
  stats: OpsDashboardStats;
};

const BROWSER_LABELS: Record<string, string> = {
  chrome: 'Chrome',
  safari: 'Safari',
  edge: 'Edge',
  firefox: 'Firefox',
  android_chrome: 'Android Chrome',
  ios_safari: 'iOS Safari',
};

export function AdminOAuthPanel({ stats }: AdminOAuthPanelProps) {
  const t = useTranslations('operations.oauth');
  const oauth = stats.oauthAnalytics;

  if (!oauth) return null;

  const overallPass = oauth.successRate >= 95;

  return (
    <Card className="border-amber-300/50 bg-gradient-to-br from-amber-50/50 to-background dark:border-amber-900 dark:from-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-4 text-amber-700 dark:text-amber-400" aria-hidden />
            {t('title')}
          </CardTitle>
          <Badge variant={overallPass ? 'default' : 'destructive'}>
            {overallPass ? t('releaseReady') : t('releaseBlocked')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {oauth.recentLogins ? (
          <div className="rounded-lg border border-border/60 bg-background/90 p-4">
            <p className="text-sm font-medium">{t('recentLogins')}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">{t('recentSuccess')}</p>
                <p className="text-2xl font-semibold tabular-nums text-emerald-600">
                  {oauth.recentLogins.successes}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('recentFailure')}</p>
                <p className="text-2xl font-semibold tabular-nums text-rose-600">
                  {oauth.recentLogins.failures}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('successRate')}</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {oauth.recentLogins.successRate}%
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('avgLoginTime')}</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {oauth.recentLogins.avgLoginSeconds}s
                </p>
              </div>
            </div>
            {oauth.recentLogins.recentErrors.length > 0 ? (
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground">{t('recentErrors')}</p>
                <p className="mt-1 font-mono text-sm">
                  {oauth.recentLogins.recentErrors[0]?.code ?? '—'}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border/60 bg-background/80 p-4">
            <p className="text-xs text-muted-foreground">{t('successRate')}</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">{oauth.successRate}%</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/80 p-4">
            <p className="text-xs text-muted-foreground">{t('avgLoginTime')}</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">
              {oauth.avgLoginSeconds}s
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/80 p-4">
            <p className="text-xs text-muted-foreground">{t('attempts')}</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">
              {oauth.successes}/{oauth.attempts}
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">{t('browserRates')}</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {oauth.browserSuccessRates.map((row) => (
              <div
                key={row.browser}
                className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 text-sm"
              >
                <span>{BROWSER_LABELS[row.browser] ?? row.browser}</span>
                <span className="font-semibold tabular-nums">{row.rate}%</span>
              </div>
            ))}
          </div>
        </div>

        {oauth.errorBreakdown.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-medium">{t('errorTracking')}</p>
            <ul className="space-y-1 text-sm">
              {oauth.errorBreakdown.map((row) => (
                <li key={row.code} className="flex justify-between rounded-md bg-muted/40 px-3 py-1.5">
                  <span className="font-mono text-xs">{row.code}</span>
                  <span className="tabular-nums">{row.count}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="size-4" aria-hidden />
            {t('qaReport')}
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {oauth.qaReport.map((row) => (
              <div
                key={row.browser}
                className={cn(
                  'flex items-center justify-between rounded-lg border px-3 py-2 text-sm',
                  row.status === 'PASS' && 'border-emerald-300/60 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20',
                  row.status === 'FAIL' && 'border-rose-300/60 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20',
                  row.status === 'PENDING' && 'border-border/50 bg-muted/20',
                )}
              >
                <span>{BROWSER_LABELS[row.browser] ?? row.browser}</span>
                <Badge
                  variant={
                    row.status === 'PASS'
                      ? 'default'
                      : row.status === 'FAIL'
                        ? 'destructive'
                        : 'outline'
                  }
                >
                  {row.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
