'use client';

import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { IntelligenceExpertScore } from '@/lib/intelligence/types';
import { cn } from '@repo/ui/lib/utils';

import { CountUp } from './count-up';

type ExpertConsensusProps = {
  experts: IntelligenceExpertScore[];
};

const ROLE_ACCENT = {
  vc: 'text-indigo-600 dark:text-indigo-400',
  pm: 'text-violet-600 dark:text-violet-400',
  cto: 'text-sky-600 dark:text-sky-400',
  marketing: 'text-amber-600 dark:text-amber-400',
} as const;

export function ExpertConsensus({ experts }: ExpertConsensusProps) {
  const t = useTranslations();

  if (experts.length === 0) return null;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {experts.map((expert) => (
        <article
          key={expert.role}
          className="ll-consulting-card-hover"
        >
          <div className="flex items-start justify-between gap-4">
            <p className={cn('text-[13px] font-semibold uppercase tracking-wider', ROLE_ACCENT[expert.role])}>
              {t(expert.labelKey)}
            </p>
            <p className="text-3xl font-semibold tabular-nums">
              <CountUp value={expert.score} />%
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'size-4',
                  i < expert.stars ? 'fill-consulting-accent text-consulting-accent' : 'text-muted-foreground/25',
                )}
              />
            ))}
            <span className="ml-2 text-[13px] font-medium text-muted-foreground">
              {t(expert.sentimentLabelKey)}
            </span>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{t(expert.opinionKey)}</p>
        </article>
      ))}
    </div>
  );
}
