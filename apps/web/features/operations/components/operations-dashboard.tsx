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
import { AdminOpsTools } from './admin-ops-tools';
import { AdminProductOsPanel } from './admin-product-os-panel';
import { AdminActivationFunnelPanel } from './admin-activation-funnel-panel';
import { AdminOAuthPanel } from './admin-oauth-panel';
import { AdminReleaseReadinessPanel } from './admin-release-readiness-panel';
import { AdminReleaseHealthPanel } from './admin-release-health-panel';
import { AdminConversionFunnelPanel } from './admin-conversion-funnel-panel';
import { AdminClosedAlphaFunnelPanel } from './admin-closed-alpha-funnel-panel';
import { AdminFunnelHeatmapPanel } from './admin-funnel-heatmap-panel';
import { AdminAlphaAnalyticsPanels } from './admin-alpha-analytics-panels';
import { AdminBlindSpotPanel } from './admin-blind-spot-panel';
import { AdminJourneyReplayPanel } from './admin-journey-replay-panel';
import { AdminQuestionDetailPanel } from './admin-question-detail-panel';
import { AdminJourneyAnalyticsPanel } from './admin-journey-analytics-panel';
import { AdminAiPmKpiPanel } from './admin-ai-pm-kpi-panel';
import { AdminProductBrainPanel } from './admin-product-brain-panel';
import { AdminFeedbackInbox } from './admin-feedback-inbox';
import { AdminReleaseNotes } from './admin-release-notes';
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
          {stats.productOs ? (
            <AdminProductOsPanel brief={stats.productOs} brain={stats.productBrain} />
          ) : null}

          <AdminOAuthPanel stats={stats} />

          <AdminReleaseHealthPanel stats={stats} />

          <AdminConversionFunnelPanel stats={stats} />

          <AdminReleaseReadinessPanel stats={stats} />

          <AdminClosedAlphaFunnelPanel stats={stats} />

          <AdminFunnelHeatmapPanel stats={stats} />

          <AdminAlphaAnalyticsPanels stats={stats} />

          {stats.todayProductKpis ? (
            <div>
              <h2 className="mb-3 text-sm font-semibold">{t('todayProductKpis')}</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <StatCard title={t('kpiNewUsers')} value={stats.todayProductKpis.newUsers} icon={Users} />
                <StatCard
                  title={t('kpiProjectsCreated')}
                  value={stats.todayProductKpis.projectsCreated}
                  icon={Sparkles}
                />
                <StatCard
                  title={t('kpiFirstReviews')}
                  value={stats.todayProductKpis.firstReviews}
                  icon={Activity}
                />
                <StatCard
                  title={t('kpiReReviews')}
                  value={stats.todayProductKpis.reReviews}
                  icon={BarChart3}
                />
                <StatCard
                  title={t('kpiArtifacts')}
                  value={stats.todayProductKpis.artifacts}
                  icon={Globe}
                />
                <StatCard
                  title={t('kpiReturns')}
                  value={stats.todayProductKpis.returns}
                  icon={Moon}
                />
              </div>
            </div>
          ) : null}

          <AdminJourneyAnalyticsPanel stats={stats} />

          <AdminAiPmKpiPanel stats={stats} />

          <AdminJourneyReplayPanel />

          <AdminBlindSpotPanel stats={stats} />

          <AdminQuestionDetailPanel stats={stats} />

          <AdminActivationFunnelPanel stats={stats} />

          {stats.productBrain?.experiments ? (
            <AdminProductBrainPanel brain={stats.productBrain} />
          ) : null}

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

          {stats.todaySummary ? (
            <div>
              <h2 className="mb-3 text-sm font-semibold">{t('todaySummary')}</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  title={t('todayGoal')}
                  value={stats.todaySummary.goalSelected}
                  icon={Users}
                />
                <StatCard
                  title={t('todayWorkspace')}
                  value={stats.todaySummary.workspaceEntered}
                  icon={Globe}
                />
                <StatCard
                  title={t('todayGo')}
                  value={stats.todaySummary.goDecisions}
                  icon={Sparkles}
                />
                <StatCard
                  title={t('todayFeedback')}
                  value={stats.todaySummary.feedbackSubmitted}
                  icon={Activity}
                />
              </div>
            </div>
          ) : null}

          {stats.productKpis ? (
            <div>
              <h2 className="mb-3 text-sm font-semibold">{t('productKpis')}</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  title={t('kpiGoalSelectionRate')}
                  value={`${stats.productKpis.goalSelectionRate}%`}
                  icon={Users}
                  hint={t('kpiGoalSelectionHint')}
                />
                <StatCard
                  title={t('kpiActivationRate')}
                  value={`${stats.productKpis.activationRate}%`}
                  icon={Sparkles}
                />
                <StatCard
                  title={t('kpiDecisionUnderstanding')}
                  value={`${stats.productKpis.decisionUnderstandingRate}%`}
                  icon={BarChart3}
                />
                <StatCard
                  title={t('kpiGoConversion')}
                  value={`${stats.productKpis.goConversionRate}%`}
                  icon={Activity}
                />
                <StatCard
                  title={t('kpiExecutionStart')}
                  value={`${stats.productKpis.executionStartRate}%`}
                  icon={Globe}
                />
                <StatCard
                  title={t('kpiAiTrust')}
                  value={`${stats.productKpis.aiTrustRate}%`}
                  icon={Sparkles}
                  hint={t('kpiAiTrustHint')}
                />
                <StatCard
                  title={t('kpiWorkflowCompletion')}
                  value={`${stats.productKpis.workflowCompletionRate}%`}
                  icon={BarChart3}
                />
                <StatCard
                  title={t('kpiProjectStartRate')}
                  value={`${stats.productKpis.projectStartRate}%`}
                  icon={Users}
                  hint={t('kpiProjectStartHint')}
                />
                <StatCard
                  title={t('kpiLandingCta')}
                  value={`${stats.productKpis.landingCtaRate}%`}
                  icon={Globe}
                />
                <StatCard
                  title={t('kpiFeedbackScore')}
                  value={`${stats.productKpis.feedbackScore}%`}
                  icon={Activity}
                />
              </div>
            </div>
          ) : null}

          {stats.closedBetaMetrics ? (
            <div>
              <h2 className="mb-3 text-sm font-semibold">{t('closedBetaMetrics')}</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  title={t('retentionRate')}
                  value={`${stats.closedBetaMetrics.retentionRate}%`}
                  icon={Users}
                />
                <StatCard
                  title={t('completionRate')}
                  value={`${stats.closedBetaMetrics.completionRate}%`}
                  icon={BarChart3}
                />
                <StatCard
                  title={t('avgJourneyMinutes')}
                  value={stats.closedBetaMetrics.avgJourneyMinutes}
                  icon={Activity}
                />
                <StatCard
                  title={t('goRatePercent')}
                  value={`${stats.closedBetaMetrics.goRatePercent}%`}
                  icon={Sparkles}
                />
                <StatCard
                  title={t('workflowCompletion')}
                  value={`${stats.closedBetaMetrics.workflowCompletionRate}%`}
                  icon={Globe}
                />
                <StatCard
                  title={t('holdDecisions')}
                  value={stats.closedBetaMetrics.holdCount}
                  icon={AlertTriangle}
                />
                <StatCard
                  title={t('workspaceProgress')}
                  value={`${stats.closedBetaMetrics.workspaceProgressAvg}%`}
                  icon={Activity}
                />
              </div>
              <div className="mt-4">
                <BreakdownList
                  title={t('goalDistribution')}
                  data={stats.closedBetaMetrics.goalDistribution}
                />
              </div>
            </div>
          ) : null}

          {stats.operationalMetrics ? (
            <div>
              <h2 className="mb-3 text-sm font-semibold">{t('operationalMetrics')}</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard title={t('users')} value={stats.operationalMetrics.users} icon={Users} />
                <StatCard title={t('sessions')} value={stats.operationalMetrics.sessions} icon={Globe} />
                <StatCard title={t('projects')} value={stats.operationalMetrics.projects} icon={Sparkles} />
                <StatCard
                  title={t('activeWorkspaces')}
                  value={stats.operationalMetrics.activeWorkspaces}
                  icon={Activity}
                />
                <StatCard
                  title={t('dropRate')}
                  value={`${stats.operationalMetrics.dropRatePercent}%`}
                  icon={AlertTriangle}
                />
                <StatCard title={t('goCount')} value={stats.operationalMetrics.goCount} icon={Sparkles} />
                <StatCard
                  title={t('feedbackCount')}
                  value={stats.operationalMetrics.feedbackCount}
                  icon={Activity}
                />
                <StatCard title={t('deployVersion')} value={stats.operationalMetrics.version} icon={BarChart3} />
              </div>
            </div>
          ) : null}

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

          {stats.productJourneyFunnel ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('productJourneyFunnel')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {(
                    [
                      ['landing', stats.productJourneyFunnel.landing],
                      ['goal', stats.productJourneyFunnel.goal],
                      ['workflow', stats.productJourneyFunnel.workflow],
                      ['workspace', stats.productJourneyFunnel.workspace],
                      ['project', stats.productJourneyFunnel.project],
                      ['analysis', stats.productJourneyFunnel.analysis],
                      ['decision', stats.productJourneyFunnel.decision],
                    ] as const
                  ).map(([key, count], index, arr) => {
                    const prev = index > 0 ? arr[index - 1][1] : null;
                    const dropRate =
                      prev && prev > 0 ? Math.round((1 - count / prev) * 100) : null;
                    return (
                      <li
                        key={key}
                        className="flex justify-between gap-4 border-b border-border/40 py-2 last:border-0"
                      >
                        <span className="capitalize">{t(`funnelSteps.${key}`)}</span>
                        <span className="text-right">
                          <span className="font-semibold tabular-nums">{count}</span>
                          {dropRate != null && dropRate > 0 ? (
                            <span className="ml-2 text-xs text-muted-foreground">
                              −{dropRate}%
                            </span>
                          ) : null}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {stats.dropOffRates && stats.dropOffRates.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('dropOffAnalysis')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  {stats.dropOffRates.map((row) => (
                    <li key={row.step}>
                      <div className="mb-1 flex justify-between gap-4">
                        <span>{row.step}</span>
                        <span className="font-semibold tabular-nums text-destructive">
                          −{row.dropPercent}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-destructive/70"
                          style={{ width: `${row.dropPercent}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.from} → {row.to}
                      </p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {stats.recentFeedback && stats.recentFeedback.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('recentFeedback')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  {stats.recentFeedback.map((item) => (
                    <li key={`${item.timestamp}-${item.sentiment}`} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{item.sentiment === 'up' ? '👍' : '👎'}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>
                      {item.message ? (
                        <p className="mt-2 text-muted-foreground">{item.message}</p>
                      ) : null}
                      {item.screen ? (
                        <p className="mt-1 font-mono text-xs text-muted-foreground">{item.screen}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {stats.analyticsProviders ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('analyticsProviders')}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3 text-sm">
                <Badge variant={stats.analyticsProviders.ga ? 'default' : 'secondary'}>
                  GA4 {stats.analyticsProviders.ga ? '✓' : '—'}
                </Badge>
                <Badge variant={stats.analyticsProviders.posthog ? 'default' : 'secondary'}>
                  PostHog {stats.analyticsProviders.posthog ? '✓' : '—'}
                </Badge>
                <Badge variant={stats.analyticsProviders.clarity ? 'default' : 'secondary'}>
                  Clarity {stats.analyticsProviders.clarity ? '✓' : '—'}
                </Badge>
                <p className="w-full text-xs text-muted-foreground">{t('analyticsProvidersHint')}</p>
              </CardContent>
            </Card>
          ) : null}

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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="size-4" />
                {t('heatmapPlaceholder')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/30 px-4 text-center text-sm text-muted-foreground"
                role="img"
                aria-label={t('heatmapPlaceholder')}
              >
                {t('heatmapPlaceholderHint')}
              </div>
            </CardContent>
          </Card>

          <AdminOpsTools stats={stats} />
          <AdminFeedbackInbox stats={stats} />
          <AdminReleaseNotes />

          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Languages className="size-3.5" />
            {t('futureGaNote')}
          </p>
        </div>
      )}
    </>
  );
}
