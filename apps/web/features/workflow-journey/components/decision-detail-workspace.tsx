'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertTriangle,
  ArrowRightLeft,
  GitBranch,
  Lightbulb,
  Scale,
  Shield,
  TrendingUp,
} from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

import { getDecisionStages } from '../constants/decision-experience';
import { computeFounderAiPmBrief } from '../lib/founder-ai-pm-engine';
import { DecisionChangeLog } from './decision-change-log';
import { CONFIDENCE_RULES, MISSING_DATA, MOCK_EVIDENCE } from '../constants/intelligence-mock';
import type { WorkflowGoalId } from '../types';
import { ConfidenceBreakdownPanel } from './founder-ai-pm/confidence-breakdown-panel';
import { EvidenceThoughtTimeline } from './founder-ai-pm/evidence-thought-timeline';
import { FounderAiSummary } from './founder-ai-pm/founder-ai-summary';
import { WhatIfScenarioPanel } from './founder-ai-pm/what-if-scenario-panel';
import { ConfidenceMeter } from './confidence-meter';
import { EvidenceCard } from './evidence-card';
import { ProjectHealthVisual } from './project-health-visual';

type Perspective = 'founder' | 'pm' | 'vc';

type DecisionDetailWorkspaceProps = {
  goalId: WorkflowGoalId;
  className?: string;
};

export function DecisionDetailWorkspace({ goalId, className }: DecisionDetailWorkspaceProps) {
  const t = useTranslations('workflow.decisionDetail');
  const ti = useTranslations('workflow.intelligence');
  const stageIndex = 2;
  const stage = getDecisionStages(goalId)[stageIndex]!;
  const founderBrief = computeFounderAiPmBrief(stage, stageIndex);
  const [perspective, setPerspective] = useState<Perspective>('founder');

  const perspectives: Perspective[] = ['founder', 'pm', 'vc'];

  return (
    <section className={cn('space-y-6', className)} aria-label={t('title')}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            {t('eyebrow')}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">{t('title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('desc')}</p>
        </div>
        <div className="flex rounded-xl border border-border/60 bg-muted/20 p-1" role="tablist">
          {perspectives.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={perspective === key}
              onClick={() => setPerspective(key)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                perspective === key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t(`views.${key}`)}
            </button>
          ))}
        </div>
      </div>

      <FounderAiSummary brief={founderBrief} />

      <div className="grid gap-4 lg:grid-cols-2">
        <EvidenceThoughtTimeline steps={founderBrief.evidenceThoughtSteps} />
        <ConfidenceBreakdownPanel items={founderBrief.confidenceBreakdown} total={stage.confidence} />
      </div>

      {founderBrief.whatIf ? <WhatIfScenarioPanel scenario={founderBrief.whatIf} /> : null}

      <div className="rounded-2xl border border-border/70 bg-card p-5">
        <p className="text-sm leading-relaxed text-foreground/90">
          {t(`perspectives.${perspective}`)}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DetailCard icon={GitBranch} title={t('sections.evidence')}>
          <div className="space-y-2">
            {MOCK_EVIDENCE.map((item, index) => (
              <EvidenceCard key={item.id} item={item} animationIndex={index} />
            ))}
          </div>
        </DetailCard>

        <DetailCard icon={TrendingUp} title={t('sections.confidence')}>
          <ConfidenceMeter
            value={stage.confidence}
            target={81}
            label={t('confidenceLabel')}
            gamified
          />
          <ul className="mt-4 space-y-2" role="list">
            {CONFIDENCE_RULES.slice(0, 3).map((rule) => (
              <li key={rule.id} className="rounded-lg border border-border/50 px-3 py-2 text-sm">
                <p className="font-medium">{ti(`rules.${rule.labelKey}`)}</p>
                <p className="mt-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  +{rule.gain}%
                </p>
              </li>
            ))}
          </ul>
        </DetailCard>

        <DetailCard icon={Shield} title={t('sections.health')}>
          <ProjectHealthVisual />
        </DetailCard>

        <DetailCard icon={Scale} title={t('sections.rules')}>
          <ul className="space-y-2" role="list">
            {CONFIDENCE_RULES.map((rule) => (
              <li key={rule.id} className="flex items-start gap-2 text-sm">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                <span>
                  <span className="font-medium">{ti(`rules.${rule.labelKey}`)}</span>
                  <span className="text-emerald-600 dark:text-emerald-400"> +{rule.gain}%</span>
                </span>
              </li>
            ))}
          </ul>
        </DetailCard>

        <DetailCard icon={AlertTriangle} title={t('sections.missing')}>
          <ul className="space-y-2" role="list">
            {MISSING_DATA.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm"
              >
                {ti(`missing.${item.labelKey}`)}
              </li>
            ))}
          </ul>
        </DetailCard>

        <DetailCard icon={TrendingUp} title={t('sections.expectedGain')}>
          <p className="text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">+28%</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('expectedGainHint')}</p>
        </DetailCard>

        <DetailCard icon={Lightbulb} title={t('sections.recommendation')}>
          <p className="text-sm font-medium">{t('recommendationTitle')}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t('recommendationBody')}</p>
        </DetailCard>

        <DetailCard icon={ArrowRightLeft} title={t('sections.alternative')}>
          {founderBrief.whatIf ? (
            <WhatIfScenarioPanel scenario={founderBrief.whatIf} className="border-0 bg-transparent p-0" />
          ) : (
            <p className="text-sm text-muted-foreground">{t('alternativeBody')}</p>
          )}
        </DetailCard>

        <DetailCard icon={AlertTriangle} title={t('sections.risk')}>
          <ul className="space-y-2 text-sm" role="list">
            <li className="rounded-lg bg-muted/30 px-3 py-2">{t('risks.market')}</li>
            <li className="rounded-lg bg-muted/30 px-3 py-2">{t('risks.execution')}</li>
          </ul>
        </DetailCard>

        <DetailCard icon={Scale} title={t('sections.tradeoff')}>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-4 border-b border-border/40 pb-2">
              <dt className="text-muted-foreground">{t('tradeoff.speed')}</dt>
              <dd className="font-medium">{t('tradeoff.speedValue')}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t('tradeoff.evidence')}</dt>
              <dd className="font-medium">{t('tradeoff.evidenceValue')}</dd>
            </div>
          </dl>
        </DetailCard>
      </div>

      <DecisionChangeLog />
    </section>
  );
}

function DetailCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Scale;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-primary" aria-hidden />
        {title}
      </p>
      <div className="mt-4">{children}</div>
    </div>
  );
}
