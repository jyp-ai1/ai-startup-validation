'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { UnderstandingPhase } from '../../lib/business-understanding/business-understanding-store';

type WorkspaceNextStepPanelProps = {
  phase: UnderstandingPhase;
  hasDocument: boolean;
  onContinueUnderstanding: () => void;
  onContinueAlignment: () => void;
  onStartReview: () => void;
  className?: string;
};

export function WorkspaceNextStepPanel({
  phase,
  hasDocument,
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
          'flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-border/60 bg-muted/10 px-6 py-10 text-center',
          className,
        )}
      >
        <Loader2 className="size-7 animate-spin text-primary" aria-hidden />
        <p className="mt-4 text-sm font-medium">{t('loadingDocument')}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t('loadingDocumentHint')}</p>
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
        <Button type="button" className="mt-5 rounded-xl" onClick={onStartReview}>
          {t('startReviewCta')}
        </Button>
      </section>
    );
  }

  if (phase === 'aligning' || phase === 'accepted' || phase === 'edit' || phase === 'together') {
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
        <p className="mt-3 text-[15px] leading-relaxed">{t('customerAlignLead')}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t('customerAlignSub')}</p>
        <Button type="button" className="mt-5 rounded-xl" onClick={onContinueAlignment}>
          {t('confirmCustomerCta')}
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
