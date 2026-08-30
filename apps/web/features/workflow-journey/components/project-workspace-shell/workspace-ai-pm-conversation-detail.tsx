'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import { formatFounderJudgmentSummary } from '../../lib/business-understanding/build-conversation-understanding-summary';
import type { LivingUnderstandingState } from '../../lib/business-understanding/living-understanding-state';
import type { AiPmLoopTurn } from '../../lib/business-understanding/workspace-ai-pm-loop-types';
import {
  countCriticalViabilityGaps,
  explainSufficiency,
} from '../../lib/business-understanding/question-causality';

type WorkspaceAiPmConversationDetailProps = {
  livingState: LivingUnderstandingState;
  lastTurn?: AiPmLoopTurn | null;
  className?: string;
};

/** P0-2 / P0-6 / P0-9 — internal judgment & coverage behind collapsed detail. */
export function WorkspaceAiPmConversationDetail({
  livingState,
  lastTurn = null,
  className,
}: WorkspaceAiPmConversationDetailProps) {
  const t = useTranslations('workflow.journey.workspaceShell.aiPmLoop');

  return (
    <details
      data-testid="conversation-detail-panel"
      className={cn('rounded-xl border border-border/50 bg-muted/10 px-4 py-3', className)}
    >
      <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
        {t('detailToggle')}
      </summary>
      <div
        data-testid="current-judgment-block"
        className="mt-3 space-y-2 border-t border-border/40 pt-3"
      >
        <p className="text-sm leading-relaxed text-foreground">
          {formatFounderJudgmentSummary(livingState)}
        </p>
        {lastTurn ? (
          <p
            data-testid="understanding-delta"
            className="text-xs text-emerald-800 dark:text-emerald-300"
          >
            {lastTurn.understandingDelta?.trim() || t('understandingUpdatedFlash')}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {t('coverageFlash', { percent: livingState.coveragePercent })}
        </p>
        {countCriticalViabilityGaps(livingState) > 0 ? (
          <p
            data-testid="critical-gap-block-hint"
            className="text-xs text-amber-800 dark:text-amber-200"
          >
            {explainSufficiency(livingState).explanation}
          </p>
        ) : null}
      </div>
    </details>
  );
}
