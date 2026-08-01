'use client';

import type { AiPmRuntimeJudgment } from '@/features/workflow-journey/lib/business-understanding/build-workspace-ai-pm-state';
import { cn } from '@repo/ui/lib/utils';
import { useTranslations } from 'next-intl';

type WorkspaceAiPmMemoryBlockProps = {
  judgment: AiPmRuntimeJudgment;
  showResumeBriefing?: boolean;
  className?: string;
};

/** Runtime judgment — regenerated from facts + current document. */
export function WorkspaceAiPmMemoryBlock({
  judgment,
  showResumeBriefing = false,
  className,
}: WorkspaceAiPmMemoryBlockProps) {
  const t = useTranslations('workflow.journey.workspaceShell.aiPmLoop');

  const phaseLabel = judgment.nextIssueId
    ? t(`issues.${judgment.nextIssueId}.riskLabel`)
    : t(`phases.${judgment.currentPhase}`);

  return (
    <div className={cn('space-y-4', className)}>
      {showResumeBriefing && judgment.resumeBriefing.trim() ? (
        <div className="rounded-xl border border-primary/20 bg-primary/[0.06] px-4 py-4">
          {judgment.resumeBriefing.split('\n').map((line, index) =>
            line.trim() ? (
              <p
                key={`${index}-${line.slice(0, 12)}`}
                className="text-[15px] font-medium leading-relaxed text-foreground"
              >
                {line}
              </p>
            ) : (
              <div key={`sp-${index}`} className="h-2" />
            ),
          )}
        </div>
      ) : null}

      {!showResumeBriefing && judgment.historyLabels.length > 0 ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('memoryLabel')}
          </p>
          <ul className="mt-1.5 space-y-1">
            {judgment.historyLabels.map((label) => (
              <li key={label} className="text-sm leading-relaxed text-foreground">
                · {label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!showResumeBriefing ? (
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-background/80 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('currentPhaseLabel')}
          </p>
          <p className="mt-1 text-sm font-medium">{phaseLabel}</p>
        </div>
        {judgment.nextQuestion.trim() ? (
          <div className="rounded-xl border border-border/70 bg-background/80 px-4 py-3 sm:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t('nextQuestionLabel')}
            </p>
            <p className="mt-1 text-sm font-medium leading-relaxed">{judgment.nextQuestion}</p>
            {judgment.reason.trim() ? (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">{t('reasonLabel')}</span>{' '}
                {judgment.reason}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      ) : null}
    </div>
  );
}
