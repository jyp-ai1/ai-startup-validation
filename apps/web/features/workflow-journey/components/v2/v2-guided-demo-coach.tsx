'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

export type GuidedDemoStep = 'welcome' | 'idea' | 'review' | 'customer' | 'complete';

type V2GuidedDemoCoachProps = {
  step: GuidedDemoStep;
  onAdvance: () => void;
  className?: string;
};

export function V2GuidedDemoCoach({ step, onAdvance, className }: V2GuidedDemoCoachProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.thinkingUx.guidedDemo');

  if (step === 'complete') return null;

  return (
    <aside
      className={cn(
        'mb-6 rounded-xl border border-primary/30 bg-primary/[0.04] p-4',
        className,
      )}
      role="status"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">
        {t('label')}
      </p>
      <p className="mt-2 text-sm font-medium leading-relaxed">{t(`steps.${step}.title`)}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t(`steps.${step}.body`)}</p>
      {step === 'welcome' ? (
        <Button type="button" size="sm" className="mt-3 rounded-lg" onClick={onAdvance}>
          {t('startCta')}
        </Button>
      ) : null}
    </aside>
  );
}

export function resolveGuidedDemoStep(input: {
  step: GuidedDemoStep;
  hasIdea: boolean;
  reviewCount: number;
  customerChanged: boolean;
}): GuidedDemoStep {
  if (input.step === 'welcome') return 'welcome';
  if (!input.hasIdea) return 'idea';
  if (input.reviewCount === 0) return 'review';
  if (!input.customerChanged) return 'customer';
  return 'complete';
}
