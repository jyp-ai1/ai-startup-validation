'use client';

import { ArrowRight, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { DAILY_COACH } from '@/features/project-intelligence/constants/daily-coach';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { useJourneyAnalytics } from '../../hooks/use-journey-analytics';

type JourneyNextActionCtaProps = {
  confidence: number;
  className?: string;
};

export function JourneyNextActionCta({ confidence, className }: JourneyNextActionCtaProps) {
  const t = useTranslations('workflow.epic4.nextAction');
  const analytics = useJourneyAnalytics();

  return (
    <section
      className={cn(
        'flex flex-col gap-4 rounded-2xl border border-primary/30 bg-primary p-5 text-primary-foreground sm:flex-row sm:items-center sm:justify-between sm:p-6',
        className,
      )}
    >
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/80">
          <Sparkles className="size-3.5" aria-hidden />
          {t('eyebrow')}
        </p>
        <p className="mt-2 text-lg font-semibold">{t('title')}</p>
        <p className="mt-1 text-sm text-primary-foreground/85">
          {t('impact', {
            current: confidence,
            after: DAILY_COACH.confidenceAfter,
            minutes: DAILY_COACH.etaMinutes,
          })}
        </p>
      </div>
      <Button
        type="button"
        size="lg"
        variant="secondary"
        className="h-12 shrink-0 rounded-xl px-6 font-semibold"
        onClick={() => {
          analytics.trackMockActionCompleted('next_action_voc', DAILY_COACH.confidenceAfter);
        }}
      >
        {t('cta')}
        <ArrowRight className="size-4" aria-hidden />
      </Button>
    </section>
  );
}
