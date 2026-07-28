'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

export type JourneyMiniNavStep = {
  id: string;
  targetId: string;
  badge?: boolean;
};

const DEFAULT_STEPS: JourneyMiniNavStep[] = [
  { id: 'investigation', targetId: 'journey-section-investigation' },
  { id: 'aiOpinion', targetId: 'ai-pm-inbox', badge: true },
  { id: 'evidence', targetId: 'journey-section-evidence' },
  { id: 'changes', targetId: 'journey-section-changes' },
  { id: 'strategy', targetId: 'journey-section-strategy' },
  { id: 'nextAction', targetId: 'journey-section-next-action', badge: true },
];

type V2JourneyMiniNavProps = {
  steps?: JourneyMiniNavStep[];
  className?: string;
};

export function V2JourneyMiniNav({ steps = DEFAULT_STEPS, className }: V2JourneyMiniNavProps) {
  const t = useTranslations('workflow.v2.journeyMiniNav');
  const [activeId, setActiveId] = useState(steps[0]?.id ?? 'investigation');

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    for (const step of steps) {
      const el = document.getElementById(step.targetId);
      if (!el) continue;

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setActiveId(step.id);
            }
          }
        },
        { rootMargin: '-20% 0px -55% 0px', threshold: 0.1 },
      );
      observer.observe(el);
      observers.push(observer);
    }

    return () => {
      observers.forEach((o) => o.disconnect());
    };
  }, [steps]);

  function scrollTo(targetId: string) {
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <nav
      className={cn(
        'sticky top-20 hidden shrink-0 flex-col gap-1 border-l border-border/60 pl-4 lg:flex lg:w-44 xl:w-52',
        className,
      )}
      aria-label={t('label')}
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {t('title')}
      </p>
      {steps.map((step) => {
        const active = activeId === step.id;
        return (
          <button
            key={step.id}
            type="button"
            onClick={() => scrollTo(step.targetId)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors',
              active
                ? 'bg-primary/10 font-semibold text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <span
              className={cn(
                'size-1.5 shrink-0 rounded-full',
                active ? 'bg-primary' : 'bg-muted-foreground/40',
              )}
              aria-hidden
            />
            <span className="flex-1">{t(`steps.${step.id}`)}</span>
            {step.badge ? (
              <span className="rounded bg-amber-500/15 px-1 py-0.5 text-[9px] font-medium text-amber-800 dark:text-amber-200">
                {t('actionBadge')}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
