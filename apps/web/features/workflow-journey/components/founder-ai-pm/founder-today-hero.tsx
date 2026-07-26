'use client';

import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { resolveFounderActionTitle } from '../../lib/founder-action-display';
import type { FounderSuccessScore, GeneratedTodayAction } from '../../lib/founder-intelligence-engine';
import { AiPmConversation } from '../ai-state/ai-pm-conversation';

type RecentScoreUpdate = {
  delta: number;
  after: number;
  actionTitle?: string;
};

type FounderTodayHeroProps = {
  score: FounderSuccessScore;
  primaryAction?: GeneratedTodayAction;
  recentScoreUpdate?: RecentScoreUpdate | null;
  onStart: () => void;
  className?: string;
};

export function FounderTodayHero({
  score,
  primaryAction,
  recentScoreUpdate,
  onStart,
  className,
}: FounderTodayHeroProps) {
  const t = useTranslations('workflow.founderAiPm.todayHeroWorkspace');
  const td = useTranslations('workflow.founderAiPm.intelligence.actionGenerator');

  const minutes = primaryAction?.etaMinutes ?? 15;
  const afterScore = Math.min(100, score.percent + (primaryAction?.goImpact ?? 4));
  const actionTitle = resolveFounderActionTitle(
    primaryAction,
    (key, params) => td(key as 'vocInterview', params),
    t('defaultAction'),
  );

  const messages: string[] = [t('greeting')];

  if (recentScoreUpdate && recentScoreUpdate.delta > 0) {
    messages.push(
      recentScoreUpdate.actionTitle
        ? t('yesterdayAction', { action: recentScoreUpdate.actionTitle })
        : t('yesterdayActionGeneric'),
      t('yesterdayScore', { delta: recentScoreUpdate.delta }),
    );
  } else if (score.delta > 0) {
    messages.push(t('yesterdayScore', { delta: score.delta }));
  }

  messages.push(
    t('oneThingLead'),
    actionTitle,
    t('etaLead', { minutes }),
    `${t('completeLead')}\n\n${score.percent}% → ${afterScore}%`,
  );

  return (
    <section
      className={cn(
        'rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/[0.08] to-background p-5 shadow-sm sm:p-7',
        className,
      )}
      aria-label={t('label')}
    >
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-primary">
        {t('aiPmLabel')}
      </p>

      <AiPmConversation messages={messages} />

      <Button
        type="button"
        size="lg"
        className="mt-6 h-14 w-full rounded-xl text-base font-semibold"
        onClick={onStart}
      >
        {t('startCta')}
        <ArrowRight className="ml-2 size-4" aria-hidden />
      </Button>
    </section>
  );
}
