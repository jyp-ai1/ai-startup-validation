'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { loadAgentPipelineResult } from '@/lib/agents/agent-run-store';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { AiPmConversation } from './ai-pm-conversation';

type AiPmCompletionHandoffProps = {
  onStartToday: () => void;
  className?: string;
};

const HANDOFF_DWELL_MS = 2500;

function resolveCtaKey(action?: { id: string; title: string }): 'ctaDefault' | 'ctaInterview' | 'ctaPricing' {
  const haystack = `${action?.id ?? ''} ${action?.title ?? ''}`.toLowerCase();
  if (haystack.includes('interview') || haystack.includes('voc') || haystack.includes('고객')) {
    return 'ctaInterview';
  }
  if (haystack.includes('pric') || haystack.includes('가격')) {
    return 'ctaPricing';
  }
  return 'ctaDefault';
}

export function AiPmCompletionHandoff({ onStartToday, className }: AiPmCompletionHandoffProps) {
  const t = useTranslations('workflow.aiPm.completion');
  const [readyToContinue, setReadyToContinue] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReadyToContinue(true), HANDOFF_DWELL_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const pipeline = loadAgentPipelineResult();
  const gap = pipeline?.decision?.intelligence?.gap ?? pipeline?.decision?.missingData?.[0];
  const primaryAction = pipeline?.founderOs?.todayActions?.[0];
  const successScore = pipeline?.founderOs?.successScore?.percent ?? pipeline?.decision?.confidence ?? 62;
  const afterScore = Math.min(100, successScore + (primaryAction?.goImpact ?? 4));
  const minutes = primaryAction?.etaMinutes ?? 15;
  const actionTitle = primaryAction?.title ?? t('defaultAction');
  const ctaKey = resolveCtaKey(primaryAction);

  const narrativeMessages = [
    t('greeting'),
    t('goodNews'),
    t('todayIntroLead'),
    `${actionTitle}\n\n${t('todayMeta', { minutes })}`,
    gap ? t('gapIntro', { gap }) : null,
  ].filter(Boolean) as string[];

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm',
        className,
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-pm-complete-title"
    >
      <div className="max-h-[92vh] w-full max-w-lg space-y-6 overflow-y-auto rounded-2xl border border-border/70 bg-card p-6 shadow-xl sm:p-8">
        <AiPmConversation messages={narrativeMessages} />

        <div className="rounded-2xl border border-primary/25 bg-primary/[0.05] p-5 text-center">
          <p id="ai-pm-complete-title" className="text-sm text-muted-foreground">
            {t('successScoreLabel')}
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <TrendingUp className="size-4 text-emerald-600" aria-hidden />
            <p className="text-2xl font-bold tabular-nums sm:text-3xl">
              {successScore}% → {afterScore}%
            </p>
          </div>
        </div>

        {!readyToContinue ? (
          <p className="text-center text-sm text-muted-foreground">{t('readingWait')}</p>
        ) : (
          <>
            <Button
              type="button"
              size="lg"
              className="h-14 w-full rounded-xl text-base font-semibold"
              onClick={onStartToday}
            >
              {t(ctaKey)}
              <ArrowRight className="ml-2 size-4" aria-hidden />
            </Button>

            <p className="whitespace-pre-line text-center text-sm leading-relaxed text-muted-foreground">
              {t('operatingHandoff')}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
