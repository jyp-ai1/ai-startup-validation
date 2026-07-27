'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Check, ChevronDown, ChevronUp, Loader2, Sparkles, Star, TrendingUp } from 'lucide-react';

import { GoogleSignInButton } from '@/features/auth/components/google-sign-in-button';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  DEMO_COMPETITORS,
  DEMO_EVIDENCE_BASE,
  DEMO_EVIDENCE_COUNT,
  DEMO_EVIDENCE_ITEMS,
  DEMO_EVIDENCE_SOURCES,
  DEMO_INBOX_ITEMS,
  DEMO_MONITORING_ITEMS,
  DEMO_RECOMMENDATION_EVIDENCE,
  DEMO_RECOMMENDATION_WHY,
  DEMO_SAMPLE_PROJECT,
  DEMO_STRATEGY_METRICS,
} from '../../lib/v2-demo-experience-data';
import {
  createEmptyDemoProjectDraft,
  isDemoProjectDraftValid,
  persistDemoProjectDraftForLogin,
  type DemoProjectDraft,
} from '../../lib/v2-demo-project-store';
import { V2SmartIntakeFlow } from './v2-smart-intake-flow';
import {
  getNextDemoStep,
  isSmartIntakeStep,
  type DemoDecisionChoice,
  type DemoExperienceStep,
} from '../../lib/v2-demo-experience-types';

const INVESTIGATING_MS = 3000;

type V2DemoExperienceProps = {
  className?: string;
};

function StarRating({ count }: { count: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${count} stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            'size-3.5',
            i < count ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30',
          )}
          aria-hidden
        />
      ))}
    </span>
  );
}

function AiPmBubble({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-primary/25 bg-gradient-to-br from-primary/[0.07] to-background px-5 py-4 shadow-sm',
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">AI PM</p>
      <div className="mt-2 space-y-2 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

export function V2DemoExperience({ className }: V2DemoExperienceProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.ia.thinkingUx.demoExperienceV2');
  const [step, setStep] = useState<DemoExperienceStep>('greeting');
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [decision, setDecision] = useState<DemoDecisionChoice | null>(null);
  const [projectDraft, setProjectDraft] = useState<DemoProjectDraft>(createEmptyDemoProjectDraft);
  const [loginDraftReady, setLoginDraftReady] = useState(false);

  useEffect(() => {
    if (step !== 'investigating') return;
    const timer = window.setTimeout(() => setStep('inbox'), INVESTIGATING_MS);
    return () => window.clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    if (step !== 'loginCta' || !isDemoProjectDraftValid(projectDraft) || loginDraftReady) return;
    persistDemoProjectDraftForLogin(projectDraft);
    setLoginDraftReady(true);
  }, [step, projectDraft, loginDraftReady]);

  const advance = () => {
    const next = getNextDemoStep(step);
    if (next) setStep(next);
  };

  const updateDraft = (draft: DemoProjectDraft) => {
    setProjectDraft(draft);
  };

  return (
    <div className={cn('space-y-6', className)}>
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          {t('label')}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{t('duration')}</p>
      </header>

      {step === 'greeting' ? (
        <AiPmBubble>
          <p>{t('steps.greeting.line1')}</p>
          <p>{t('steps.greeting.line2')}</p>
          <p className="font-medium">{t('steps.greeting.line3')}</p>
          <Button type="button" size="sm" className="mt-4 rounded-lg" onClick={advance}>
            {t('steps.greeting.cta')}
          </Button>
        </AiPmBubble>
      ) : null}

      {step === 'sampleProject' ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-muted/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t('steps.sampleProject.projectLabel')}
            </p>
            <p className="mt-2 text-lg font-semibold">{DEMO_SAMPLE_PROJECT.name}</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">{t('steps.sampleProject.service')}</dt>
                <dd className="mt-0.5 font-medium">{DEMO_SAMPLE_PROJECT.service}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t('steps.sampleProject.taglineLabel')}</dt>
                <dd className="mt-0.5 leading-relaxed">{t('steps.sampleProject.tagline')}</dd>
              </div>
            </dl>
          </div>
          <p className="text-center text-xs text-muted-foreground">{t('steps.sampleProject.hint')}</p>
          <Button type="button" className="w-full rounded-lg" onClick={advance}>
            {t('steps.sampleProject.cta')}
          </Button>
        </div>
      ) : null}

      {step === 'investigating' ? (
        <AiPmBubble className="text-center">
          <p>{t('steps.investigating.line1')}</p>
          <p className="font-medium">{t('steps.investigating.line2')}</p>
          <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            <span className="text-xs">{t('steps.investigating.loading')}</span>
          </div>
        </AiPmBubble>
      ) : null}

      {step === 'inbox' ? (
        <div className="space-y-4">
          <AiPmBubble>
            <p className="font-medium">{t('steps.inbox.title')}</p>
          </AiPmBubble>
          <ul className="space-y-2 rounded-xl border border-border/40 bg-muted/5 p-4">
            {DEMO_INBOX_ITEMS.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm">
                <Check className="size-4 shrink-0 text-primary" aria-hidden />
                {t(`steps.inbox.items.${item}`)}
              </li>
            ))}
          </ul>
          <Button type="button" className="w-full rounded-lg" onClick={advance}>
            {t('steps.inbox.cta')}
          </Button>
        </div>
      ) : null}

      {step === 'opinion' ? (
        <div className="space-y-4">
          <AiPmBubble>
            <p>{t('steps.opinion.line1')}</p>
            <p className="font-medium">{t('steps.opinion.line2')}</p>
            <p>{t('steps.opinion.line3')}</p>
            <ul className="mt-2 space-y-1">
              {DEMO_COMPETITORS.map((name) => (
                <li key={name} className="font-medium text-foreground">
                  {name}
                </li>
              ))}
            </ul>
            <p className="mt-2">{t('steps.opinion.line4')}</p>
          </AiPmBubble>
          <Button type="button" variant="outline" className="w-full rounded-lg" onClick={advance}>
            {t('steps.opinion.cta')}
          </Button>
        </div>
      ) : null}

      {step === 'evidence' ? (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">{t('steps.evidence.sectionTitle')}</h3>
            <div className="mt-1 flex items-center gap-2">
              <StarRating count={5} />
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {t('steps.evidence.marketStatus')}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {DEMO_EVIDENCE_ITEMS.map((item) => (
              <div
                key={item}
                className="rounded-lg border border-border/40 bg-muted/5 px-4 py-3"
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {t(`steps.evidence.items.${item}.label`)}
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {t(`steps.evidence.items.${item}.value`)}
                </p>
              </div>
            ))}
          </div>

          <AiPmBubble>
            <p>{t('steps.evidence.interpretation.line1')}</p>
            <p className="font-medium">{t('steps.evidence.interpretation.line2')}</p>
            <p>{t('steps.evidence.interpretation.line3')}</p>
          </AiPmBubble>

          <Button type="button" className="w-full rounded-lg" onClick={advance}>
            {t('steps.evidence.cta')}
          </Button>
        </div>
      ) : null}

      {step === 'changeDetected' ? (
        <div className="space-y-4">
          <AiPmBubble>
            <p className="font-medium">{t('steps.changeDetected.line1')}</p>
            <p>{t('steps.changeDetected.line2')}</p>
            <p className="font-medium text-amber-600 dark:text-amber-400">
              {t('steps.changeDetected.line3')}
            </p>
            <p>{t('steps.changeDetected.line4')}</p>
          </AiPmBubble>
          <Button type="button" className="w-full rounded-lg" onClick={advance}>
            {t('steps.changeDetected.cta')}
          </Button>
        </div>
      ) : null}

      {step === 'strategyImprovement' ? (
        <div className="space-y-4">
          <AiPmBubble>
            <p className="font-medium">{t('steps.strategyImprovement.line1')}</p>
          </AiPmBubble>

          <div className="space-y-3 rounded-xl border border-border/40 bg-muted/5 p-4">
            {DEMO_STRATEGY_METRICS.map((metric) => (
              <div key={metric} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">
                  {t(`steps.strategyImprovement.metrics.${metric}.label`)}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground line-through">
                    {t(`steps.strategyImprovement.metrics.${metric}.before`)}
                  </span>
                  <TrendingUp className="size-3.5 text-primary" aria-hidden />
                  <span className="font-semibold text-primary">
                    {t(`steps.strategyImprovement.metrics.${metric}.after`)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/[0.06] to-background shadow-sm">
            <div className="border-b border-border/40 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                {t('steps.strategyImprovement.recommendationCard.title')}
              </p>
              <p className="mt-2 text-lg font-semibold">
                {t('steps.strategyImprovement.recommendationCard.headline')}
              </p>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {t('steps.strategyImprovement.recommendationCard.whyLabel')}
                </p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {DEMO_RECOMMENDATION_WHY.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                      <span>{t(`steps.strategyImprovement.recommendationCard.why.${item}`)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm font-medium leading-relaxed">
                  {t('steps.strategyImprovement.recommendationCard.conclusion')}
                </p>
              </div>

              <div className="space-y-2 border-t border-border/40 pt-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {t('steps.strategyImprovement.recommendationCard.evidenceLabel')}
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {DEMO_RECOMMENDATION_EVIDENCE.map((item) => (
                    <li key={item}>{t(`steps.strategyImprovement.recommendationCard.evidence.${item}`)}</li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between border-t border-border/40 pt-4 text-sm">
                <span className="text-muted-foreground">
                  {t('steps.strategyImprovement.recommendationCard.confidenceLabel')}
                </span>
                <span className="font-semibold text-primary">84%</span>
              </div>

              <p className="rounded-lg bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                {t('steps.strategyImprovement.recommendationCard.evidenceBasis', {
                  count: DEMO_EVIDENCE_COUNT,
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                {DEMO_EVIDENCE_BASE.map((item) =>
                  t(`steps.strategyImprovement.recommendationCard.evidenceBase.${item}`),
                ).join(' · ')}
              </p>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full rounded-lg"
                onClick={() => setEvidenceOpen((open) => !open)}
              >
                {evidenceOpen
                  ? t('steps.strategyImprovement.recommendationCard.hideEvidence')
                  : t('steps.strategyImprovement.recommendationCard.viewEvidence')}
                {evidenceOpen ? (
                  <ChevronUp className="ml-1 size-4" aria-hidden />
                ) : (
                  <ChevronDown className="ml-1 size-4" aria-hidden />
                )}
              </Button>

              {evidenceOpen ? (
                <ul className="grid grid-cols-2 gap-2 rounded-lg border border-border/40 bg-muted/5 p-3 text-xs">
                  {DEMO_EVIDENCE_SOURCES.map((source) => (
                    <li key={source} className="font-medium">
                      {t(`steps.strategyImprovement.recommendationCard.sources.${source}`)}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="space-y-3 border-t border-border/40 bg-muted/10 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t('steps.strategyImprovement.recommendationCard.decisionLabel')}
              </p>
              {decision ? (
                <p className="text-sm font-medium text-primary">
                  {t(`steps.strategyImprovement.recommendationCard.decisions.${decision}`)}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    className="rounded-lg"
                    onClick={() => setDecision('proceed')}
                  >
                    {t('steps.strategyImprovement.recommendationCard.ctaProceed')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-lg"
                    onClick={() => setDecision('hold')}
                  >
                    {t('steps.strategyImprovement.recommendationCard.ctaHold')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-lg"
                    onClick={() => setDecision('compare')}
                  >
                    {t('steps.strategyImprovement.recommendationCard.ctaCompare')}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {decision ? (
            <Button type="button" className="w-full rounded-lg" onClick={advance}>
              {t('steps.strategyImprovement.cta')}
            </Button>
          ) : null}
        </div>
      ) : null}

      {step === 'continuousManagement' ? (
        <div className="space-y-4">
          <AiPmBubble>
            <p className="font-medium">{t('steps.continuousManagement.line1')}</p>
            <p>{t('steps.continuousManagement.line2')}</p>
            <p className="font-medium">{t('steps.continuousManagement.line3')}</p>
          </AiPmBubble>

          <ul className="space-y-2 rounded-xl border border-border/40 bg-muted/5 p-4">
            {DEMO_MONITORING_ITEMS.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm">
                <Check className="size-3.5 shrink-0 text-primary" aria-hidden />
                {t(`steps.continuousManagement.items.${item}`)}
              </li>
            ))}
          </ul>

          <AiPmBubble>
            <p className="font-medium">{t('steps.continuousManagement.closing')}</p>
          </AiPmBubble>

          <Button type="button" className="w-full rounded-lg" onClick={advance}>
            {t('steps.continuousManagement.cta')}
          </Button>
        </div>
      ) : null}

      {step === 'tryMyProject' ? (
        <div className="space-y-4 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/[0.06] to-background px-6 py-8 text-center">
          <Sparkles className="mx-auto size-8 text-primary" aria-hidden />
          <div>
            <p className="text-lg font-semibold">{t('steps.tryMyProject.title')}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t('steps.tryMyProject.body')}</p>
          </div>
          <Button type="button" className="w-full rounded-lg" onClick={advance}>
            {t('steps.tryMyProject.cta')}
          </Button>
        </div>
      ) : null}

      {isSmartIntakeStep(step) ? (
        <V2SmartIntakeFlow
          step={step}
          projectDraft={projectDraft}
          onDraftChange={updateDraft}
          onStepChange={setStep}
          onAdvance={advance}
          AiPmBubble={AiPmBubble}
          StarRating={StarRating}
        />
      ) : null}

      {step === 'savePrompt' ? (
        <div className="space-y-4">
          <AiPmBubble>
            <p className="font-medium">{t('steps.savePrompt.line1')}</p>
            <p>{t('steps.savePrompt.line2')}</p>
            <p className="font-medium text-amber-600 dark:text-amber-400">
              {t('steps.savePrompt.line3')}
            </p>
          </AiPmBubble>

          <ul className="space-y-2 rounded-xl border border-border/40 bg-muted/5 p-4">
            {(['todayReview', 'evidence', 'decisionHistory', 'meetingNotes', 'alerts'] as const).map(
              (item) => (
                <li key={item} className="flex items-center gap-2 text-sm">
                  <Check className="size-3.5 shrink-0 text-primary" aria-hidden />
                  {t(`steps.savePrompt.benefits.${item}`)}
                </li>
              ),
            )}
          </ul>

          <AiPmBubble>
            <p>{t('steps.savePrompt.closing')}</p>
          </AiPmBubble>

          <Button type="button" className="w-full rounded-lg" onClick={advance}>
            {t('steps.savePrompt.cta')}
          </Button>
        </div>
      ) : null}

      {step === 'loginCta' ? (
        <div className="space-y-6 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/[0.08] to-background px-6 py-8 text-center">
          <Sparkles className="mx-auto size-8 text-primary" aria-hidden />
          <div>
            <p className="text-lg font-semibold">{t('steps.loginCta.title')}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t('steps.loginCta.body')}</p>
          </div>
          <GoogleSignInButton
            redirectTo="/workspace?from=demo&promote=1"
            className="w-full rounded-lg"
          />
          <p className="text-xs text-muted-foreground">{t('steps.loginCta.hint')}</p>
        </div>
      ) : null}
    </div>
  );
}
