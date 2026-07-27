'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  buildInboxDialogue,
  getActiveConsultingQuestion,
} from '../../lib/v2-ai-pm-consulting-dialogue';
import type { V2ValidationEvidence } from '../../lib/v2-validation-store';

type V2AiPmConsultingThreadProps = {
  evidence: V2ValidationEvidence;
  reviewCount: number;
  hasIdea: boolean;
  investigationViewed: boolean;
  readOnly?: boolean;
  onShowEvidence?: (evidenceKey: string) => void;
  onFounderReply?: (text: string) => void;
  className?: string;
};

export function V2AiPmConsultingThread({
  evidence,
  reviewCount,
  hasIdea,
  investigationViewed,
  readOnly = false,
  onShowEvidence,
  onFounderReply,
  className,
}: V2AiPmConsultingThreadProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.ia.thinkingUx.aiPmDialogue');
  const tQ = useTranslations('workflow.v2.strategyWorkspace.ia.thinkingUx.consultingQuestions');
  const tTurns = useTranslations('workflow.v2.strategyWorkspace.ia.thinkingUx.aiPmDialogue.turns');

  const ctx = { evidence, reviewCount, hasIdea, investigationViewed };
  const turns = buildInboxDialogue(ctx);
  const activeQuestion = getActiveConsultingQuestion(ctx);
  const [expandedWhy, setExpandedWhy] = useState<string | null>(null);
  const [recorded, setRecorded] = useState(false);

  if (turns.length === 0) return null;

  const handleWhy = (questionKey: string, evidenceKey?: string) => {
    setExpandedWhy(questionKey);
    if (evidenceKey && onShowEvidence) onShowEvidence(evidenceKey);
  };

  const handleFounderSample = () => {
    const reply = t('founderSampleReply');
    setRecorded(true);
    onFounderReply?.(reply);
  };

  return (
    <div className={cn('space-y-3 border-t border-border/40 pt-4', className)}>
      {turns.map((turn) => (
        <div
          key={turn.id}
          className={cn(
            'rounded-lg px-3 py-2.5 text-sm leading-relaxed',
            turn.role === 'ai' ? 'bg-primary/[0.06]' : 'bg-muted/30',
          )}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {turn.role === 'ai' ? t('aiLabel') : t('founderLabel')}
          </p>
          <p className="mt-1">{tTurns(turn.textKey)}</p>
          {turn.evidenceKey && expandedWhy === turn.questionKey ? (
            <p className="mt-2 text-xs text-muted-foreground">{t('evidenceLinked')}</p>
          ) : null}
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        {!readOnly ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-lg text-xs"
              onClick={() => handleWhy(getActiveQuestionKey(turns), 'googleTrends')}
            >
              {t('whyButton')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-lg text-xs"
              onClick={handleFounderSample}
            >
              {t('founderReplyButton')}
            </Button>
          </>
        ) : null}
      </div>

      {recorded ? (
        <p className="text-sm text-primary">{t('recordedInMeetingNote')}</p>
      ) : null}

      <p className="text-xs text-muted-foreground italic">{tQ(activeQuestion)}</p>
    </div>
  );
}

function getActiveQuestionKey(
  turns: ReturnType<typeof buildInboxDialogue>,
): string {
  const lead = turns.find((t) => t.id === 'lead');
  return lead?.questionKey ?? 'continueLead';
}
