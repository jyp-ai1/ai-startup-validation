'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { UnderstandingPhase } from '../../lib/business-understanding/business-understanding-store';
import type { WorkspaceReviewBlockedReason } from '../../lib/business-understanding/workspace-state';

import type { MarketAlignmentState } from '../../lib/business-understanding/workspace-alignment';

type WorkspaceNextStepPanelProps = {
  phase: UnderstandingPhase;
  hasDocument: boolean;
  canStartReview?: boolean;
  reviewBlockedReason?: WorkspaceReviewBlockedReason | null;
  alignment?: MarketAlignmentState | null;
  onContinueUnderstanding: () => void;
  onContinueAlignment: () => void;
  onStartReview: () => void;
  className?: string;
};

export function WorkspaceNextStepPanel({
  phase,
  hasDocument,
  canStartReview = true,
  reviewBlockedReason = null,
  alignment = null,
  onContinueUnderstanding,
  onContinueAlignment,
  onStartReview,
  className,
}: WorkspaceNextStepPanelProps) {
  const t = useTranslations('workflow.journey.workspaceShell.nextStep');

  if (!hasDocument) {
    return (
      <section
        className={cn(
          'flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-primary/30 bg-primary/[0.03] px-6 py-10 text-center',
          className,
        )}
      >
        <p className="text-sm font-medium">{t('missingDocument')}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t('missingDocumentHint')}</p>
      </section>
    );
  }

  if (phase === 'review-ready') {
    return (
      <section
        className={cn(
          'rounded-2xl border border-primary/25 bg-primary/[0.04] px-6 py-6 sm:px-8',
          className,
        )}
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
          {t('aiLabel')}
        </p>
        <p className="mt-3 text-[15px] leading-relaxed">{t('reviewReadyLead')}</p>
        <Button
          type="button"
          className="mt-5 rounded-xl"
          disabled={!canStartReview}
          onClick={onStartReview}
          aria-disabled={!canStartReview}
        >
          {t('startReviewCta')}
        </Button>
        {/* S15 P0-2 — never silent: blocked Review always explains why */}
        {!canStartReview ? (
          <p className="mt-3 text-sm text-muted-foreground" role="status">
            {reviewBlockedReason
              ? t(`reviewBlocked.${reviewBlockedReason}`)
              : t('reviewBlocked.generic')}
          </p>
        ) : null}
      </section>
    );
  }

  if (phase === 'aligning' || phase === 'accepted' || phase === 'edit' || phase === 'together' || phase === 'edit_confirm') {
    const thinkingSelected = alignment?.direction === 'thinking';
    return (
      <section
        className={cn(
          'rounded-2xl border border-primary/25 bg-primary/[0.04] px-6 py-6 sm:px-8',
          className,
        )}
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
          {t('aiLabel')}
        </p>
        <p className="mt-3 text-[15px] leading-relaxed">
          {thinkingSelected ? t('thinkingPreserveLead') : t('customerAlignLead')}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {thinkingSelected ? t('thinkingPreserveSub') : t('customerAlignSub')}
        </p>
        <Button type="button" className="mt-5 rounded-xl" onClick={onContinueAlignment}>
          {thinkingSelected ? t('continueReviewCta') : t('confirmCustomerCta')}
        </Button>
      </section>
    );
  }

  return (
    <section
      className={cn(
        'rounded-2xl border border-primary/25 bg-primary/[0.04] px-6 py-6 sm:px-8',
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">{t('aiLabel')}</p>
      <p className="mt-3 text-[15px] leading-relaxed">{t('understandingLead')}</p>
      <p className="mt-2 text-sm text-muted-foreground">{t('understandingSub')}</p>
      <Button type="button" className="mt-5 rounded-xl" onClick={onContinueUnderstanding}>
        {t('continueUnderstandingCta')}
      </Button>
    </section>
  );
}
