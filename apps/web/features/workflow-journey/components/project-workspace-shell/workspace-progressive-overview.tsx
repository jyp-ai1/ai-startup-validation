'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type {
  WorkspaceSharedUnderstanding,
  WorkspaceUnderstandingSpine,
} from '../../lib/business-understanding/build-shared-understanding';
import type { UnderstandingProvenance } from '../../lib/business-understanding/understanding-contract';
import type { AiPmLoopIssueId } from '../../lib/business-understanding/workspace-ai-pm-loop-types';
import type { OverviewBlockId, WorkspaceScoreDimensionSnapshot } from './workspace-shell-types';
import { WorkspaceScoreBreakdown } from './workspace-score-breakdown';

type FieldKey = keyof WorkspaceSharedUnderstanding;

const MARK_GLYPH = {
  known: '✔',
  progress: '●',
  unknown: '○',
} as const;

function provenanceLabelKey(provenance: UnderstandingProvenance): string {
  switch (provenance) {
    case 'DOCUMENT':
      return 'provenance.document';
    case 'USER_CONFIRMED':
      return 'provenance.userConfirmed';
    case 'USER_CORRECTED':
      return 'provenance.userCorrected';
    case 'AI_INFERENCE':
      return 'provenance.aiInference';
    case 'EXTERNAL_EVIDENCE':
      return 'provenance.externalEvidence';
    default:
      return 'provenance.unknown';
  }
}

type WorkspaceProgressiveOverviewProps = {
  businessScore: number | null;
  scoreDimensions?: WorkspaceScoreDimensionSnapshot[];
  reviewCount: number;
  /** Domain lifecycle progress — drives post-review progressive reveal */
  completedTopics?: number;
  /** Live Understanding SoT — Overview is a state board, not an empty menu */
  spine?: WorkspaceUnderstandingSpine | null;
  sharedUnderstanding?: WorkspaceSharedUnderstanding | null;
  nextIssueId?: AiPmLoopIssueId | null;
  nextIssueLabel?: string | null;
  /** v2 — deterministic specificity % */
  understandingCoveragePercent?: number | null;
  className?: string;
};

/**
 * Overview = real Understanding state board (Summary) + optional post-review blocks.
 */
export function WorkspaceProgressiveOverview({
  businessScore,
  scoreDimensions = [],
  reviewCount,
  completedTopics = 0,
  spine = null,
  sharedUnderstanding = null,
  nextIssueId = null,
  nextIssueLabel = null,
  understandingCoveragePercent = null,
  className,
}: WorkspaceProgressiveOverviewProps) {
  const t = useTranslations('workflow.journey.workspaceShell.overview');
  const ts = useTranslations('workflow.journey.workspaceShell.sharedUnderstanding');

  const board =
    spine ??
    (sharedUnderstanding
      ? {
          ...sharedUnderstanding,
          provenance: {
            business: 'UNKNOWN' as const,
            customer: 'UNKNOWN' as const,
            problem: 'UNKNOWN' as const,
          },
          confidence: {
            business: 'UNKNOWN' as const,
            customer: 'UNKNOWN' as const,
            problem: 'UNKNOWN' as const,
          },
          marks: {
            business: 'unknown' as const,
            customer: 'unknown' as const,
            problem: 'unknown' as const,
          },
        }
      : null);

  const rows: Array<{ key: FieldKey; value: string }> = board
    ? [
        { key: 'business', value: board.business },
        { key: 'customer', value: board.customer },
        { key: 'problem', value: board.problem },
      ]
    : [];

  const showPostReview =
    reviewCount > 0 || completedTopics >= 2;

  /** Core Final W14 — never render stock B2B SaaS template; prefer Living spine. */
  const livingSummary =
    board != null
      ? [
          board.business?.trim() ? `Business: ${board.business.trim()}` : null,
          board.customer?.trim() ? `Customer: ${board.customer.trim()}` : null,
          board.problem?.trim() ? `Problem: ${board.problem.trim()}` : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : '';
  const summaryText =
    livingSummary.length > 12
      ? `${livingSummary}. ${t('summaryBody')}`
      : t('summaryBody');
  const nextStepText =
    nextIssueId && nextIssueLabel?.trim()
      ? nextIssueLabel.trim()
      : t('nextStepAction');

  if (!board && !showPostReview) {
    return (
      <div
        data-testid="workspace-overview-empty"
        className={cn('py-12 text-center text-sm text-muted-foreground', className)}
      >
        {t('empty')}
      </div>
    );
  }

  return (
    <div
      data-testid="workspace-overview-state-board"
      className={cn('max-w-[640px] space-y-10 py-2', className)}
    >
      {board ? (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t('stateBoardLabel')}
          </h2>
          {understandingCoveragePercent != null ? (
            <p
              data-testid="understanding-coverage-percent"
              className="mt-2 text-sm text-muted-foreground"
            >
              {t('coverageLabel', { percent: understandingCoveragePercent })}
            </p>
          ) : null}
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            {rows.map((row) => {
              const mark = board.marks[row.key];
              const provenance = board.provenance[row.key];
              return (
                <div
                  key={row.key}
                  data-mark={mark}
                  className="min-w-0 rounded-lg border border-border/50 bg-muted/15 px-3 py-2.5"
                >
                  <dt className="flex flex-wrap items-baseline gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <span aria-hidden className="font-semibold text-foreground/70">
                      {MARK_GLYPH[mark]}
                    </span>
                    <span>{ts(`fields.${row.key}`)}</span>
                  </dt>
                  <dd className="mt-1 text-sm font-medium leading-snug text-foreground">
                    {row.value}
                  </dd>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {ts(provenanceLabelKey(provenance))}
                  </p>
                </div>
              );
            })}
          </dl>
          <div className="mt-5 rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
              {t('nextGapLabel')}
            </p>
            <p className="mt-2 text-sm font-medium leading-relaxed">
              {nextIssueId && nextIssueLabel ? nextIssueLabel : t('noGap')}
            </p>
          </div>
        </section>
      ) : null}

      {showPostReview && businessScore != null ? (
        <WorkspaceScoreBreakdown
          total={businessScore}
          dimensions={scoreDimensions}
          className="animate-in fade-in slide-in-from-bottom-2 duration-300"
        />
      ) : null}

      {showPostReview && reviewCount > 0 ? (
        <>
          <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t('summaryLabel')}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed" data-testid="overview-summary-body">
              {summaryText}
            </p>
          </section>
          <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <p className="text-xs font-semibold text-muted-foreground">{t('nextStepLabel')}</p>
            <p className="mt-2 flex items-center gap-2 text-base font-medium">
              <span className="text-muted-foreground">→</span>
              {nextStepText}
            </p>
          </section>
          <details className="animate-in fade-in border-t border-border/60 pt-6 duration-300">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
              {t('riskLabel')}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t('riskBody')}</p>
          </details>
          <details className="animate-in fade-in border-t border-border/60 pt-6 duration-300">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
              {t('recommendationLabel')}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t('recommendationBody')}
            </p>
          </details>
        </>
      ) : null}
    </div>
  );
}

/** Kept for type consumers that still reference progressive block ids. */
export const OVERVIEW_BLOCK_ORDER: OverviewBlockId[] = [
  'score',
  'summary',
  'nextStep',
  'risk',
  'recommendation',
];
