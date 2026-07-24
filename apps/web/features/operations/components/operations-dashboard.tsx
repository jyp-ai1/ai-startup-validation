'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Globe,
  Languages,
  Moon,
  Sparkles,
  Users,
} from 'lucide-react';

import type { OpsDashboardStats } from '@/lib/analytics/types';
import { Badge, Card, CardContent, CardHeader, CardTitle, PageHeader } from '@repo/ui';

function StatCard({
  title,
  value,
  icon: Icon,
  hint,
}: {
  title: string;
  value: string | number;
  icon: typeof Users;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function BreakdownList({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data);
  const total = entries.reduce((sum, [, count]) => sum + count, 0) || 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">—</p>
        ) : (
          entries.map(([key, count]) => (
            <div key={key}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium uppercase">{key}</span>
                <span className="tabular-nums text-muted-foreground">
                  {Math.round((count / total) * 100)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(count / total) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function OperationsDashboard() {
  const t = useTranslations('operations');
  const [stats, setStats] = useState<OpsDashboardStats | null>(null);
  const [aiStats, setAiStats] = useState<{
    avgLatencyMs: number;
    totalTokens: number;
    totalCostUsd: number;
    model: string;
    openrouterConfigured: boolean;
    openaiConfigured: boolean;
    fallbackModel: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/analytics/stats')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setStats(json.data);
        else setError(json.error?.message ?? 'Failed to load stats');
      })
      .catch(() => setError('Failed to load stats'));

    fetch('/api/ai/health')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setAiStats({
            avgLatencyMs: json.data.tokenStats.avgLatencyMs,
            totalTokens: json.data.tokenStats.totalTokens,
            totalCostUsd: json.data.tokenStats.totalCostUsd,
            model: json.data.model,
            openrouterConfigured: json.data.openrouterConfigured,
            openaiConfigured: json.data.openaiConfigured ?? false,
            fallbackModel: json.data.fallbackModel ?? 'gpt-4o-mini',
          });
        }
      })
      .catch(() => {
        /* optional */
      });
  }, []);

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          stats ? (
            <Badge variant={stats.source === 'live' ? 'default' : 'secondary'}>
              {stats.source === 'live' ? t('liveData') : t('mockData')}
            </Badge>
          ) : null
        }
      />

      {error ? (
        <p className="mt-6 text-sm text-destructive">{error}</p>
      ) : !stats ? (
        <p className="mt-6 text-sm text-muted-foreground">{t('loading')}</p>
      ) : (
        <div className="mt-8 space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title={t('todayVisitors')} value={stats.todayVisitors} icon={Users} />
            <StatCard title={t('weekVisitors')} value={stats.weekVisitors} icon={Globe} />
            <StatCard title={t('projectCreates')} value={stats.projectCreates} icon={Sparkles} />
            <StatCard
              title={t('aiGenerations')}
              value={stats.aiGenerations}
              icon={Activity}
              hint={t('aiGenerationsHint')}
            />
          </div>

          {aiStats ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard
                title="AI avg latency"
                value={`${aiStats.avgLatencyMs}ms`}
                icon={Activity}
                hint={aiStats.model}
              />
              <StatCard title="AI tokens" value={aiStats.totalTokens} icon={BarChart3} />
              <StatCard
                title="AI cost (USD)"
                value={`$${aiStats.totalCostUsd.toFixed(4)}`}
                icon={Sparkles}
              />
              <StatCard
                title="OpenRouter"
                value={aiStats.openrouterConfigured ? 'Configured' : 'Mock fallback'}
                icon={Globe}
              />
              <StatCard
                title="OpenAI fallback"
                value={aiStats.openaiConfigured ? aiStats.fallbackModel : 'Not set'}
                icon={Sparkles}
              />
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-3">
            <StatCard title={t('reportGenerations')} value={stats.reportGenerations} icon={BarChart3} />
            <StatCard
              title={t('gaStatus')}
              value={stats.gaConnected ? t('gaConnected') : t('gaDisabled')}
              icon={Globe}
              hint={t('gaHint')}
            />
            <StatCard title={t('totalEvents')} value={stats.totalEvents} icon={Activity} />
          </div>

          {stats.activationFunnel ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Activation funnel (beta)</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {(
                    [
                      ['Landing / CTA', stats.activationFunnel.landing],
                      ['Signup / Login', stats.activationFunnel.signup],
                      ['Wizard complete', stats.activationFunnel.wizardComplete],
                      ['Research execute', stats.activationFunnel.researchExecute],
                      ['Decision generate', stats.activationFunnel.decisionGenerate],
                      ['Report generate', stats.activationFunnel.reportGenerate],
                    ] as const
                  ).map(([label, count]) => (
                    <li key={label} className="flex justify-between gap-4 border-b border-border/40 py-2 last:border-0">
                      <span>{label}</span>
                      <span className="font-semibold tabular-nums">{count}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <BreakdownList title={t('languageBreakdown')} data={stats.languageBreakdown} />
            <BreakdownList title={t('themeBreakdown')} data={stats.themeBreakdown} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('topScreens')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {stats.topScreens.map((item) => (
                    <li key={item.screen} className="flex justify-between gap-4">
                      <span className="truncate font-mono text-xs">{item.screen}</span>
                      <span className="tabular-nums text-muted-foreground">{item.count}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="size-4" />
                  {t('recentErrors')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.recentErrors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('noErrors')}</p>
                ) : (
                  <ul className="space-y-3 text-sm">
                    {stats.recentErrors.map((item) => (
                      <li key={`${item.timestamp}-${item.message}`} className="rounded-lg border p-3">
                        <p className="font-medium">{item.message}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.screen ?? '—'} · {new Date(item.timestamp).toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Moon className="size-4" />
                {t('webVitals')}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase text-muted-foreground">LCP</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {stats.webVitals.lcp != null ? `${stats.webVitals.lcp}ms` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">CLS</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {stats.webVitals.cls != null ? stats.webVitals.cls.toFixed(3) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">INP</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {stats.webVitals.inp != null ? `${stats.webVitals.inp}ms` : '—'}
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Languages className="size-3.5" />
            {t('futureGaNote')}
          </p>
        </div>
      )}
    </>
  );
}
