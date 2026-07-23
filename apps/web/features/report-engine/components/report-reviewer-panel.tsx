'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle2, MessageSquare } from 'lucide-react';

import type { ExecutiveReport } from '../types/report-types';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

type ReportReviewerPanelProps = {
  report: ExecutiveReport;
  onResolve: (commentId: string) => void;
  onApprove: () => void;
  pending?: boolean;
};

const WORKFLOW_STEPS = ['AI_GENERATED', 'IN_REVIEW', 'APPROVED', 'EXPORTED'] as const;

const STEP_KEYS = {
  AI_GENERATED: 'review.steps.aiGenerated',
  IN_REVIEW: 'review.steps.inReview',
  APPROVED: 'review.steps.approved',
  EXPORTED: 'review.steps.exported',
} as const;

export function ReportReviewerPanel({
  report,
  onResolve,
  onApprove,
  pending,
}: ReportReviewerPanelProps) {
  const t = useTranslations('reportEngine');

  const stepIndex = WORKFLOW_STEPS.indexOf(
    report.review.status === 'IN_REVIEW' ? 'IN_REVIEW' : report.review.status,
  );

  return (
    <section className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold">{t('review.title')}</h3>
        <p className="text-xs text-muted-foreground">{t('review.desc')}</p>
      </div>

      <ol className="flex flex-wrap gap-2">
        {WORKFLOW_STEPS.map((step, idx) => (
          <li
            key={step}
            className={cn(
              'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider',
              idx <= stepIndex ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
            )}
          >
            {t(STEP_KEYS[step])}
          </li>
        ))}
      </ol>

      <ul className="space-y-2">
        {report.review.comments.map((comment) => (
          <li
            key={comment.id}
            className={cn(
              'flex items-start gap-3 rounded-lg border px-3 py-2 text-sm',
              comment.status === 'RESOLVED' ? 'opacity-60' : 'border-primary/20',
            )}
          >
            <MessageSquare className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="font-medium">{t(comment.bodyKey as 'review.sampleComment')}</p>
              <p className="text-xs text-muted-foreground">
                {t(comment.authorKey as 'review.sampleAuthor')} · {comment.sectionId}
              </p>
            </div>
            {comment.status === 'OPEN' ? (
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => onResolve(comment.id)}>
                {t('review.resolve')}
              </Button>
            ) : (
              <CheckCircle2 className="size-4 text-emerald-600" />
            )}
          </li>
        ))}
      </ul>

      {report.review.status !== 'APPROVED' && report.review.status !== 'EXPORTED' ? (
        <Button size="sm" disabled={pending} onClick={onApprove}>
          {t('review.approve')}
        </Button>
      ) : null}
    </section>
  );
}
