'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { AiPmScoreNarrative } from '../../lib/build-ai-pm-score-narrative';
import type { AiPmLoopIssueId } from '../../lib/business-understanding/workspace-ai-pm-loop-types';

type WorkspaceAiPmScorePanelProps = {
  narrative: AiPmScoreNarrative;
  onFixPrimary?: (issueId: AiPmLoopIssueId) => void;
  readOnly?: boolean;
  emphasis?: 'hero' | 'supporting';
  className?: string;
};

export function WorkspaceAiPmScorePanel({
  narrative,
  onFixPrimary,
  readOnly = false,
  emphasis = 'hero',
  className,
}: WorkspaceAiPmScorePanelProps) {
  const t = useTranslations('workflow.journey.workspaceShell.aiPmScore');
  const { score, strengths, gaps, potentialTotal, primaryGap } = narrative;
  const supporting = emphasis === 'supporting';

  return (
    <section
      className={cn(
        supporting
          ? 'rounded-2xl border border-border/60 bg-muted/20 px-5 py-4 sm:px-7'
          : 'rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.04] to-background px-5 py-5 sm:px-7',
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {t('label')}
      </p>
      {!supporting ? (
        <p className="mt-3 text-4xl font-bold tabular-nums tracking-tight">
          {score.total}
          <span className="ml-1 text-lg font-medium text-muted-foreground">/100</span>
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          {t('supportingScore', { score: score.total ?? 0 })}
        </p>
      )}

      <div className="mt-5 space-y-4">
        <div>
          <p className="text-sm font-semibold">{t('whyTitle')}</p>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed">
            {strengths.map((id) => (
              <li key={id} className="flex items-start gap-2">
                <span className="shrink-0 text-emerald-600" aria-hidden>
                  ✔
                </span>
                <span>{t(`strengths.${id}`)}</span>
              </li>
            ))}
            {gaps.slice(0, 3).map((gap) => (
              <li key={gap.issueId} className="flex items-start gap-2">
                <span className="shrink-0 text-amber-600" aria-hidden>
                  ❗
                </span>
                <span>{t(`gaps.${gap.issueId}`)}</span>
              </li>
            ))}
          </ul>
        </div>

        {gaps.length > 0 ? (
          <p className="rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-3 text-sm leading-relaxed">
            {t('potentialLead', {
              target: potentialTotal,
              count: Math.min(gaps.length, 2),
            })}
          </p>
        ) : null}

        <details className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium">{t('breakdownToggle')}</summary>
          <ul className="mt-3 space-y-2 text-sm">
            {score.dimensions.map((dimension) => (
              <li key={dimension.id} className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">
                  {t(`dimensions.${dimension.id}` as 'dimensions.marketFit')}
                </span>
                <span className="font-semibold tabular-nums">{dimension.score}</span>
              </li>
            ))}
          </ul>
        </details>
      </div>

      {primaryGap && onFixPrimary ? (
        <Button
          type="button"
          className="mt-5 w-full rounded-xl sm:w-auto"
          disabled={readOnly}
          onClick={() => onFixPrimary(primaryGap.issueId)}
        >
          {t('fixPrimaryCta', {
            issue: t(`actions.${primaryGap.issueId}` as 'actions.customer_definition'),
          })}
        </Button>
      ) : null}
    </section>
  );
}
