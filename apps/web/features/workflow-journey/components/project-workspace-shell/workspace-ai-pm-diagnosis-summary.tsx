'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { AiPmInitialDiagnosis } from '../../lib/business-understanding/build-ai-pm-initial-diagnosis';
import type { AiPmLoopIssueId } from '../../lib/business-understanding/workspace-ai-pm-loop-types';

type WorkspaceAiPmDiagnosisSummaryProps = {
  diagnosis: AiPmInitialDiagnosis;
  primaryIssueId: AiPmLoopIssueId | null;
  readOnly?: boolean;
  onContinue: () => void;
  className?: string;
};

export function WorkspaceAiPmDiagnosisSummary({
  diagnosis,
  primaryIssueId,
  readOnly = false,
  onContinue,
  className,
}: WorkspaceAiPmDiagnosisSummaryProps) {
  const t = useTranslations('workflow.journey.workspaceShell.aiPmLoop.diagnosis');
  const tIssues = useTranslations('workflow.journey.workspaceShell.aiPmLoop');
  const tReading = useTranslations('workflow.journey.workspaceShell.aiPmLoop.reading');

  const primaryLabel = primaryIssueId ? tIssues(`issues.${primaryIssueId}.riskLabel`) : null;

  return (
    <section
      className={cn(
        'rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.05] to-background px-5 py-5 sm:px-7',
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
        {t('aiLabel')}
      </p>
      <p className="mt-3 text-xl font-semibold tracking-tight">{t('title')}</p>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t('readItemsTitle')}
        </p>
        <ul className="mt-3 space-y-2">
          {diagnosis.readSummaryIds.map((stepId) => (
            <li key={stepId} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 shrink-0 text-emerald-600" aria-hidden>
                ✓
              </span>
              <span className="font-medium">{tReading(`summary.${stepId}`)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 border-t border-border/60 pt-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t('confidenceLabel')}
        </p>
        <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight">
          {diagnosis.confidencePercent}
          <span className="text-2xl">%</span>
        </p>
      </div>

      {diagnosis.topRiskIssueIds.length > 0 ? (
        <div className="mt-6">
          <p className="text-sm font-semibold">{t('risksTitle')}</p>
          <ol className="mt-3 space-y-2">
            {diagnosis.topRiskIssueIds.map((issueId, index) => (
              <li key={issueId} className="flex gap-2 text-sm leading-relaxed">
                <span className="shrink-0 font-semibold tabular-nums text-primary">
                  {index + 1}
                </span>
                <span>{tIssues(`issues.${issueId}.riskLabel`)}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {primaryLabel ? (
        <p className="mt-5 text-[15px] font-medium leading-relaxed">
          {t('firstFocusLead', { issue: primaryLabel })}
        </p>
      ) : null}

      <Button type="button" className="mt-5 rounded-xl" disabled={readOnly} onClick={onContinue}>
        {primaryLabel ? t('ctaWithIssue', { issue: primaryLabel }) : t('cta')}
      </Button>
    </section>
  );
}
