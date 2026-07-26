'use client';

import { useState } from 'react';
import { ChevronDown, MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { AiPmMeetingBrief } from '../../lib/founder-ai-pm-meeting';
import { AiPmConversation } from '../ai-state/ai-pm-conversation';
import { FounderExplainableJudgmentPanel } from './founder-explainable-judgment-panel';
import type { ExplainableJudgment } from '../../lib/founder-explainable-judgment';

type FounderAiPmMeetingPanelProps = {
  meeting: AiPmMeetingBrief;
  judgment: ExplainableJudgment;
  className?: string;
};

export function FounderAiPmMeetingPanel({
  meeting,
  judgment,
  className,
}: FounderAiPmMeetingPanelProps) {
  const t = useTranslations('workflow.founderAiPm.meeting');
  const [expanded, setExpanded] = useState(false);

  return (
    <section
      className={cn(
        'rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/[0.08] to-background p-5 sm:p-6',
        className,
      )}
      aria-label={t('label')}
    >
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
        <MessageSquare className="size-3.5" aria-hidden />
        {t('label')}
      </p>

      <AiPmConversation messages={meeting.narrativeLines} />

      <div className="mt-5 rounded-xl border border-primary/25 bg-background/90 px-4 py-4 text-center">
        <p className="text-sm text-muted-foreground">{t('verdictLead')}</p>
        <p className="mt-2 text-2xl font-bold">{t(`verdicts.${meeting.verdictKey}`)}</p>
        <p className="mt-2 text-xs text-muted-foreground">{t('scoreBasisNote')}</p>
        <p className="mt-1 text-lg font-semibold tabular-nums">{meeting.scorePercent}%</p>
      </div>

      <button
        type="button"
        className="mt-4 flex w-full items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-left text-sm font-medium"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        {t('expandCta')}
        <ChevronDown
          className={cn('size-4 transition-transform', expanded && 'rotate-180')}
          aria-hidden
        />
      </button>

      {expanded ? (
        <div className="mt-4">
          <FounderExplainableJudgmentPanel judgment={judgment} />
        </div>
      ) : null}
    </section>
  );
}
