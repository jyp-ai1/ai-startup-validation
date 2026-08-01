'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { AiPmInitialDiagnosis } from '../../lib/business-understanding/build-ai-pm-initial-diagnosis';
import type { AiPmLoopIssueId } from '../../lib/business-understanding/workspace-ai-pm-loop-types';

const CONFIDENCE_REVEAL_MS = 1400;
const RISKS_REVEAL_MS = 2300;

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

  const [showConfidence, setShowConfidence] = useState(false);
  const [showRisks, setShowRisks] = useState(false);

  useEffect(() => {
    const confidenceTimer = window.setTimeout(() => setShowConfidence(true), CONFIDENCE_REVEAL_MS);
    const risksTimer = window.setTimeout(() => setShowRisks(true), RISKS_REVEAL_MS);
    return () => {
      window.clearTimeout(confidenceTimer);
      window.clearTimeout(risksTimer);
    };
  }, []);

  const primaryLabel = primaryIssueId ? tIssues(`issues.${primaryIssueId}.riskLabel`) : null;
  const primaryRisk = useMemo(() => {
    if (!primaryIssueId) return null;
    return diagnosis.riskScores.find((item) => item.issueId === primaryIssueId) ?? null;
  }, [diagnosis.riskScores, primaryIssueId]);

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
      <p className="mt-2 text-sm text-muted-foreground">{t('readItemsLead')}</p>

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

      {primaryRisk && showRisks ? (
        <div className="mt-6 rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            {t('primaryRiskTitle')}
          </p>
          <p className="mt-2 text-base font-semibold">
            {primaryLabel}
            <span className="ml-2 text-sm font-medium text-muted-foreground">
              {t('primaryRiskScore', { score: primaryRisk.score })}
            </span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {primaryRisk.rationale}
          </p>
        </div>
      ) : null}

      <div
        className={cn(
          'mt-6 border-t border-border/60 pt-5 transition-all duration-500',
          showConfidence ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-2',
        )}
        aria-hidden={!showConfidence}
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t('confidenceLabel')}
        </p>
        <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight">
          {diagnosis.confidencePercent}
          <span className="text-2xl">%</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {diagnosis.confidenceRationale ?? t('confidenceHint')}
        </p>
      </div>

      {diagnosis.topRiskIssueIds.length > 0 ? (
        <div
          className={cn(
            'mt-6 transition-all duration-500',
            showRisks ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-2',
          )}
          aria-hidden={!showRisks}
        >
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

      {primaryLabel && showRisks ? (
        <p className="mt-5 text-[15px] font-medium leading-relaxed">
          {t('firstFocusLead', { issue: primaryLabel })}
        </p>
      ) : null}

      <Button
        type="button"
        className={cn(
          'mt-5 rounded-xl transition-all duration-500',
          showRisks ? 'opacity-100' : 'pointer-events-none opacity-40',
        )}
        disabled={readOnly || !showRisks}
        onClick={onContinue}
      >
        {primaryLabel ? t('ctaWithIssue', { issue: primaryLabel }) : t('cta')}
      </Button>
    </section>
  );
}
