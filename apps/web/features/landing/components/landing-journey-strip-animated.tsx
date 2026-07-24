'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

const STEPS = ['goal', 'workflow', 'decision', 'execution'] as const;

type LandingJourneyStripAnimatedProps = {
  className?: string;
};

export function LandingJourneyStripAnimated({ className }: LandingJourneyStripAnimatedProps) {
  const t = useTranslations('landing.hero.journey');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % STEPS.length);
    }, 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className={cn(
        'rounded-2xl border border-border/60 bg-muted/30 p-4 sm:p-5',
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('label')}</p>
      <ol className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0" role="list">
        {STEPS.map((step, index) => {
          const active = index === activeIndex;
          const done = index < activeIndex;
          return (
            <li key={step} className="flex flex-1 items-center gap-2 sm:flex-col sm:gap-1">
              <div className="flex w-full items-center gap-2 sm:flex-col">
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-all duration-500 sm:size-10 sm:text-sm',
                    active && 'scale-110 bg-primary text-primary-foreground shadow-md',
                    done && 'bg-emerald-600 text-white',
                    !active && !done && 'bg-muted text-muted-foreground',
                  )}
                >
                  {done ? '✓' : index + 1}
                </span>
                <span
                  className={cn(
                    'text-sm font-semibold transition-colors sm:text-center',
                    active ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {t(step)}
                </span>
              </div>
              {index < STEPS.length - 1 ? (
                <ArrowRight
                  className={cn(
                    'mx-auto size-4 shrink-0 transition-colors sm:mx-2',
                    index < activeIndex ? 'text-emerald-600' : 'text-muted-foreground/50',
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
          style={{ width: `${((activeIndex + 1) / STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
