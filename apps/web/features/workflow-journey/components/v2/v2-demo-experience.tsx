'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Loader2, Sparkles, Star, TrendingUp } from 'lucide-react';

import { GoogleSignInButton } from '@/features/auth/components/google-sign-in-button';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  DEMO_COMPETITORS,
  DEMO_EVIDENCE_ITEMS,
  DEMO_INBOX_ITEMS,
  DEMO_MONITORING_ITEMS,
  DEMO_SAMPLE_PROJECT,
  DEMO_STRATEGY_METRICS,
} from '../../lib/v2-demo-experience-data';
import {
  getNextDemoStep,
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

  useEffect(() => {
    if (step !== 'investigating') return;
    const timer = window.setTimeout(() => {
      setStep('inbox');
    }, INVESTIGATING_MS);
    return () => window.clearTimeout(timer);
  }, [step]);

  const advance = () => {
    const next = getNextDemoStep(step);
    if (next) setStep(next);
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

          <div className="rounded-xl border border-primary/30 bg-primary/[0.04] p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              {t('steps.strategyImprovement.recommendationLabel')}
            </p>
            <p className="mt-2 text-sm font-medium">{t('steps.strategyImprovement.recommendation')}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('steps.strategyImprovement.positioning')}
            </p>
          </div>

          <Button type="button" className="w-full rounded-lg" onClick={advance}>
            {t('steps.strategyImprovement.cta')}
          </Button>
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

      {step === 'cta' ? (
        <div className="space-y-6 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/[0.08] to-background px-6 py-8 text-center">
          <Sparkles className="mx-auto size-8 text-primary" aria-hidden />
          <div>
            <p className="text-lg font-semibold">{t('steps.cta.title')}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t('steps.cta.body')}</p>
          </div>
          <GoogleSignInButton redirectTo="/workspace" className="w-full rounded-lg" />
          <p className="text-xs text-muted-foreground">{t('steps.cta.hint')}</p>
        </div>
      ) : null}
    </div>
  );
}
