'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { ActionDebriefSnapshot } from '../../lib/founder-project-state-store';
import type { WorkflowGoalId } from '../../types';
import { AiPmConversation } from '../ai-state/ai-pm-conversation';
import { JourneyFocusedShell } from '../journey-focused-shell';
import { FounderExecutiveDecisionBoardLoader } from './founder-executive-decision-board-loader';

type FounderActionDebriefProps = {
  debrief: ActionDebriefSnapshot;
  onContinue: () => void;
  className?: string;
  projectId?: string;
  projectName?: string;
  goalId?: WorkflowGoalId;
  confidence?: number;
};

export function FounderActionDebrief({
  debrief,
  onContinue,
  className,
  projectId,
  projectName,
  goalId,
  confidence,
}: FounderActionDebriefProps) {
  const t = useTranslations('workflow.founderAiPm.operating.debrief');
  const [showScorePulse, setShowScorePulse] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowScorePulse(true), 200);
    return () => window.clearTimeout(timer);
  }, []);

  const tomorrowAction = debrief.nextActionTitle ?? t('tomorrowDefault');
  const messages = [
    t('lead', { action: debrief.actionTitle }),
    t('scoreNarrative', {
      before: debrief.scoreBefore,
      after: debrief.scoreAfter,
    }),
    t('projectUpdated'),
    t('tomorrowLine', {
      action: tomorrowAction,
      minutes: debrief.nextActionMinutes ?? 15,
    }),
  ];

  const debriefRail = (
    <>
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
    </>
  );

  const strategyPanel =
    projectId && projectName && goalId && confidence != null ? (
      <FounderExecutiveDecisionBoardLoader
        projectId={projectId}
        projectName={projectName}
        goalId={goalId}
        confidence={confidence}
      />
    ) : null;

  return (
    <JourneyFocusedShell
      ariaLabel={t('scoreLabel')}
      className={className}
      activeStep="execution"
      right={strategyPanel ?? undefined}
    >
      {debriefRail}
    </JourneyFocusedShell>
  );
}
