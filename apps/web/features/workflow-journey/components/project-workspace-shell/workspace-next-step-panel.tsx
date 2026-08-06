'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { UnderstandingPhase } from '../../lib/business-understanding/business-understanding-store';
import type { WorkspaceSharedUnderstanding } from '../../lib/business-understanding/build-shared-understanding';
import type { WorkspaceReviewBlockedReason } from '../../lib/business-understanding/workspace-state';

import type { MarketAlignmentState } from '../../lib/business-understanding/workspace-alignment';

type WorkspaceNextStepPanelProps = {
  phase: UnderstandingPhase;
  hasDocument: boolean;
  canStartReview?: boolean;
  reviewBlockedReason?: WorkspaceReviewBlockedReason | null;
  alignment?: MarketAlignmentState | null;
  /** S17-4 — full AI understanding for Final Review before Analysis */
  finalUnderstanding?: WorkspaceSharedUnderstanding | null;
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
  finalUnderstanding = null,
  onContinueUnderstanding,
  onContinueAlignment,
  onStartReview,
  className,
}: WorkspaceNextStepPanelProps) {
  const t = useTranslations('workflow.journey.workspaceShell.nextStep');
  const ts = useTranslations('workflow.journey.workspaceShell.sharedUnderstanding');

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
        data-testid="final-understanding-confirm"
        className={cn(
          'rounded-2xl border border-primary/25 bg-primary/[0.04] px-6 py-6 sm:px-8',
          className,
        )}
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
          {t('aiLabel')}
        </p>
        <p className="mt-3 text-[15px] font-medium leading-relaxed">{t('finalReviewLead')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('finalReviewSub')}</p>

        {finalUnderstanding ? (
          <dl className="mt-4 grid gap-3 rounded-xl border border-border/60 bg-background/80 px-4 py-4 sm:grid-cols-3">
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {ts('fields.business')}
              </dt>
              <dd className="mt-1 text-sm font-medium">{finalUnderstanding.business}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {ts('fields.customer')}
              </dt>
              <dd className="mt-1 text-sm font-medium">{finalUnderstanding.customer}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {ts('fields.problem')}
              </dt>
              <dd className="mt-1 text-sm font-medium">{finalUnderstanding.problem}</dd>
            </div>
          </dl>
        ) : null}

        <Button
          type="button"
          className="mt-5 rounded-xl"
          disabled={!canStartReview}
          onClick={onStartReview}
          aria-disabled={!canStartReview}
        >
          {t('finalConfirmCta')}
        </Button>
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
