'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { ActionDebriefSnapshot } from '../../lib/founder-project-state-store';
import { AiPmConversation } from '../ai-state/ai-pm-conversation';

type FounderActionDebriefProps = {
  debrief: ActionDebriefSnapshot;
  onContinue: () => void;
  className?: string;
};

export function FounderActionDebrief({ debrief, onContinue, className }: FounderActionDebriefProps) {
  const t = useTranslations('workflow.founderAiPm.operating.debrief');
  const [showScorePulse, setShowScorePulse] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowScorePulse(true), 200);
    return () => window.clearTimeout(timer);
  }, []);

  const verdictChanged = debrief.verdictBefore !== debrief.verdictAfter;
  const messages = [
    t('lead', { action: debrief.actionTitle }),
    t('praise'),
    t('scoreLine', { delta: debrief.scoreDelta }),
    t('projectUpdated'),
    t('todayRefreshLead'),
    ...(verdictChanged
      ? [t('verdictChange', { before: debrief.verdictBefore, after: debrief.verdictAfter })]
      : []),
  ];

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm',
        className,
      )}
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[92vh] w-full max-w-lg space-y-5 overflow-y-auto rounded-2xl border border-border/70 bg-card p-6 shadow-xl sm:p-8">
        <AiPmConversation messages={messages} />

        <div
          className={cn(
            'rounded-2xl border border-emerald-300/40 bg-emerald-50/50 p-5 text-center transition-all duration-700 dark:bg-emerald-950/20',
            showScorePulse ? 'scale-100 opacity-100' : 'scale-95 opacity-70',
          )}
        >
          <p className="text-sm text-muted-foreground">{t('scoreLabel')}</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <TrendingUp className="size-4 text-emerald-600" aria-hidden />
            <p className="text-2xl font-bold tabular-nums">
              {debrief.scoreBefore}% → {debrief.scoreAfter}%
            </p>
          </div>
        </div>

        <Button type="button" size="lg" className="h-14 w-full rounded-xl" onClick={onContinue}>
          {t('continueCta')}
          <ArrowRight className="ml-2 size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
