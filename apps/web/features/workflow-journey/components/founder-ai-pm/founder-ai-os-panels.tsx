'use client';

import {
  BarChart3,
  Brain,
  Building2,
  LineChart,
  Rocket,
  Scale,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { AiOperatingSystemBrief, HealthStatus } from '../../lib/founder-ai-operating-system';
import { AiPmConversation } from '../ai-state/ai-pm-conversation';

function healthEmoji(status: HealthStatus): string {
  if (status === 'green') return '🟢';
  if (status === 'yellow') return '🟡';
  return '🔴';
}

function OsSection({
  icon: Icon,
  label,
  children,
  className,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn('rounded-2xl border border-border/70 bg-card p-5 sm:p-6', className)}
      aria-label={label}
    >
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-primary">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function FounderAiOperatingSystemSection({
  brief,
  onApprove,
  className,
}: {
  brief: AiOperatingSystemBrief;
  onApprove?: (actionId: string) => void;
  className?: string;
}) {
  const t = useTranslations('workflow.founderAiPm.aiOs');

  return (
    <div className={cn('space-y-6', className)}>
      <header className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/[0.06] to-background px-5 py-4 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-primary">
          {t('header.label')}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{t('header.lead')}</p>
      </header>

      <OsSection icon={BarChart3} label={t('ceoDashboard.label')}>
        <p className="text-sm font-medium">{t('ceoDashboard.healthTitle')}</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2" role="list">
          {brief.ceoDashboard.dimensions.map((dim) => (
            <li key={dim.key} className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2 text-sm">
              <span>
                {healthEmoji(dim.status)} {t(`ceoDashboard.dimensions.${dim.key}`)}
              </span>
              <span className="text-muted-foreground tabular-nums">{dim.percent}%</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-200/50 bg-emerald-500/[0.06] px-4 py-3">
            <p className="text-xs text-muted-foreground">{t('ceoDashboard.weeklyProgressLabel')}</p>
            <p className="mt-1 text-lg font-bold tabular-nums">
              +{brief.ceoDashboard.weeklyProgress}%
            </p>
          </div>
          <div className="rounded-xl border border-rose-200/50 bg-rose-500/[0.06] px-4 py-3">
            <p className="text-xs text-muted-foreground">{t('ceoDashboard.riskLabel')}</p>
            <p className="mt-1 text-sm font-semibold">
              {t(`ceoDashboard.risks.${brief.ceoDashboard.topRiskKey}`, brief.ceoDashboard.topRiskParams ?? {})}
            </p>
          </div>
        </div>
      </OsSection>

      <OsSection icon={Brain} label={t('companyMemory.label')}>
        <ol className="space-y-3" role="list">
          {brief.companyMemory.entries.map((entry) => (
            <li key={entry.id} className="flex gap-3 text-sm">
              <span className="shrink-0 font-medium tabular-nums text-muted-foreground">
                {t('companyMemory.monthLine', { month: entry.month })}
              </span>
              <span>{t(`companyMemory.events.${entry.messageKey}`)}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {t(`companyMemory.recall.${brief.companyMemory.recallMessageKey}`)}
        </p>
      </OsSection>

      <OsSection icon={Scale} label={t('decisionCenter.label')}>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {brief.decisionCenter.flowSteps.map((step, index) => (
            <span key={step} className="flex items-center gap-2">
              {index > 0 ? <span aria-hidden>↓</span> : null}
              {t(`decisionCenter.flow.${step}`)}
            </span>
          ))}
        </div>
        <div className="mt-5 rounded-xl border-2 border-primary/30 bg-primary/[0.06] px-4 py-4 text-center">
          <p className="text-xs text-muted-foreground">{t('decisionCenter.resultLabel')}</p>
          <p className="mt-1 text-2xl font-bold">{brief.decisionCenter.verdict}</p>
          <p className="mt-1 text-sm tabular-nums">{brief.decisionCenter.confidence}%</p>
        </div>
        <ul className="mt-4 space-y-2" role="list">
          {brief.decisionCenter.meetingNotes.map((note) => (
            <li key={note} className="text-sm">
              • {t(`decisionCenter.notes.${note}`)}
            </li>
          ))}
        </ul>
      </OsSection>

      <OsSection icon={LineChart} label={t('simulator.label')}>
        <p className="text-sm text-muted-foreground">
          {t('simulator.priceLead', { price: brief.businessSimulator.basePrice.toLocaleString() })}
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {brief.businessSimulator.scenarios.map((scenario) => (
            <div key={scenario.id} className="rounded-xl border border-border/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {t(`simulator.${scenario.labelKey}`)}
              </p>
              <p className="mt-2 text-lg font-bold tabular-nums">
                {scenario.price.toLocaleString()}원
              </p>
              <p className="mt-2 text-sm">{t('simulator.customers', { count: scenario.customers })}</p>
              <p className="text-sm">{t('simulator.revenue', { amount: scenario.revenue.toLocaleString() })}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {t(`simulator.risks.${scenario.riskKey}`)}
              </p>
            </div>
          ))}
        </div>
      </OsSection>

      <OsSection icon={Users} label={t('board.label')}>
        <ul className="space-y-2" role="list">
          {brief.aiBoard.opinions.map((opinion) => (
            <li key={opinion.roleKey} className="rounded-xl border border-border/60 px-3 py-2 text-sm">
              <span className="font-semibold">{t(`board.roles.${opinion.roleKey}`)}</span>
              <span className="text-muted-foreground"> — </span>
              {t(`board.opinions.${opinion.opinionKey}`)}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-center text-lg font-bold">
          {brief.aiBoard.goVotes} : {brief.aiBoard.holdVotes} → {brief.aiBoard.verdict}
        </p>
      </OsSection>

      <OsSection icon={Sparkles} label={t('customerIntel.label')}>
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(brief.customerIntelligence.sourceCounts).map(([key, count]) => (
            <span key={key} className="rounded-full border border-border/60 px-3 py-1">
              {t(`customerIntel.sources.${key}`)} {count}
            </span>
          ))}
        </div>
        <AiPmConversation
          messages={[t(`customerIntel.insights.${brief.customerIntelligence.weeklyInsightKey}`)]}
          className="mt-4"
        />
      </OsSection>

      <OsSection icon={TrendingUp} label={t('growth.label')}>
        <ul className="space-y-2" role="list">
          {brief.growthEngine.recommendations.map((rec) => (
            <li key={rec.id} className="text-sm">
              {t('growth.recommend', {
                channel: t(`growth.channels.${rec.channelKey}`),
                count: rec.count,
                unit: t(`growth.units.${rec.unitKey}`),
              })}
            </li>
          ))}
        </ul>
      </OsSection>

      <OsSection icon={Wallet} label={t('fundraising.label')}>
        <p className="text-sm tabular-nums">
          {t('fundraising.readiness', { percent: brief.fundraisingOs.readinessPercent })}
        </p>
        <ul className="mt-3 space-y-1" role="list">
          {brief.fundraisingOs.readinessKeys.map((key) => (
            <li key={key} className="text-sm">
              ✓ {t(`fundraising.items.${key}`)}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          {t(`fundraising.investor.${brief.fundraisingOs.investorCheckKey}`)}
        </p>
      </OsSection>

      <OsSection icon={Building2} label={t('companyOs.label')}>
        <div className="space-y-3">
          {brief.companyOs.horizons.map((horizon) => (
            <div key={horizon.key}>
              <div className="mb-1 flex justify-between text-xs">
                <span>{t(`companyOs.horizons.${horizon.key}`)}</span>
                <span className="tabular-nums">{Math.round(horizon.percent)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${horizon.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm font-medium">
          {t('companyOs.quarterGoal', { percent: brief.companyOs.quarterGoalPercent })}
        </p>
      </OsSection>

      <OsSection icon={Zap} label={t('autonomous.label')}>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {brief.autonomousCompany.completedSteps.map((step, index) => (
            <span key={step} className="flex items-center gap-2">
              {index > 0 ? <span aria-hidden>↓</span> : null}
              {t(`autonomous.steps.${step}`)}
            </span>
          ))}
        </div>
        <div className="mt-5 rounded-xl border border-emerald-300/40 bg-emerald-500/[0.06] px-4 py-4">
          <p className="text-sm text-muted-foreground">{t('autonomous.approvalLead')}</p>
          <p className="mt-2 font-semibold">{brief.autonomousCompany.pendingApprovalTitle}</p>
          {onApprove && brief.autonomousCompany.pendingActionId ? (
            <Button
              type="button"
              className="mt-4 w-full rounded-xl"
              onClick={() => onApprove(brief.autonomousCompany.pendingActionId!)}
            >
              {t('autonomous.approveCta')}
            </Button>
          ) : null}
        </div>
      </OsSection>

      <OsSection icon={Target} label={t('predictive.label')}>
        <ul className="space-y-3" role="list">
          {brief.predictiveCompany.insights.map((insight) => (
            <li key={insight.id} className="text-sm leading-relaxed">
              {t(`predictive.insights.${insight.messageKey}`, insight.params ?? {})}
            </li>
          ))}
        </ul>
      </OsSection>

      <OsSection
        icon={Rocket}
        label={t('founderTwin.label')}
        className="border-2 border-violet-300/40 bg-gradient-to-br from-violet-500/[0.06] to-background"
      >
        <p className="text-sm text-muted-foreground">
          {t('founderTwin.learned', { count: brief.founderTwin.decisionsLearned })}
        </p>
        <AiPmConversation
          messages={[
            t('founderTwin.question'),
            t(`founderTwin.recommendations.${brief.founderTwin.recommendationKey}`, brief.founderTwin.recommendationParams ?? {}),
          ]}
          className="mt-4"
        />
      </OsSection>
    </div>
  );
}
