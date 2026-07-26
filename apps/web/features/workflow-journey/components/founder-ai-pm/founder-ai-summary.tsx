'use client';

import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { FounderAiPmBrief } from '../../lib/founder-ai-pm-engine';

type FounderAiSummaryProps = {
  brief: FounderAiPmBrief;
  className?: string;
};

export function FounderAiSummary({ brief, className }: FounderAiSummaryProps) {
  const t = useTranslations('workflow.founderAiPm.summary');

  return (
    <div
      className={cn(
        'rounded-xl border border-primary/30 bg-gradient-to-br from-primary/[0.08] to-primary/[0.02] px-4 py-3.5',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-primary">
        <Sparkles className="size-3.5" aria-hidden />
        {t('label')}
      </p>
      <p className="mt-2 text-sm font-medium leading-relaxed text-foreground">
        {t(brief.summaryKey, brief.summaryParams)}
      </p>
    </div>
  );
}
