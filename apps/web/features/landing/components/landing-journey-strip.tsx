import { getTranslations } from 'next-intl/server';
import { ArrowDown } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

type LandingJourneyStripProps = {
  className?: string;
};

export async function LandingJourneyStrip({ className }: LandingJourneyStripProps) {
  const t = await getTranslations('landing.hero.journey');
  const steps = ['goal', 'workflow', 'decision', 'execution'] as const;

  return (
    <div
      className={cn(
        'rounded-2xl border border-border/60 bg-muted/30 p-4 sm:p-5',
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('label')}</p>
      <ol className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0" role="list">
        {steps.map((step, index) => (
          <li key={step} className="flex flex-1 items-center gap-2 sm:flex-col sm:gap-1">
            <div className="flex w-full items-center gap-2 sm:flex-col">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground sm:size-10 sm:text-sm">
                {index + 1}
              </span>
              <span className="text-sm font-semibold text-foreground sm:text-center">{t(step)}</span>
            </div>
            {index < steps.length - 1 ? (
              <ArrowDown
                className="mx-auto size-4 shrink-0 text-muted-foreground sm:hidden"
                aria-hidden
              />
            ) : null}
            {index < steps.length - 1 ? (
              <span className="hidden h-px flex-1 bg-border sm:mx-2 sm:block" aria-hidden />
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
