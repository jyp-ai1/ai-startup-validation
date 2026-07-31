'use client';

import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { WorkshopAgreementState } from '../../lib/business-understanding/workspace-decision-workshop';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

type WorkspacePostReviewRoadmapProps = {
  workshopAgreement: WorkshopAgreementState | null;
  workshopAgreed: boolean;
  showPrimaryAction?: boolean;
  primaryActionLabel?: string;
  className?: string;
};

export function WorkspacePostReviewRoadmap({
  workshopAgreement,
  workshopAgreed,
  showPrimaryAction = false,
  primaryActionLabel,
  className,
}: WorkspacePostReviewRoadmapProps) {
  const t = useTranslations('workflow.journey.workspaceShell.postReview');

  const activeTopicLabel =
    workshopAgreed && workshopAgreement?.customLabel?.trim()
      ? workshopAgreement.customLabel.trim()
      : workshopAgreed && workshopAgreement?.topicId
        ? t(`topics.${workshopAgreement.topicId}`)
        : null;

  const items = [
    {
      id: 'workshop',
      label: activeTopicLabel ?? t('steps.workshop'),
      status: workshopAgreed ? ('active' as const) : ('next' as const),
    },
    {
      id: 'strategy',
      label: t('steps.strategyCompare'),
      status: 'upcoming' as const,
    },
    {
      id: 'decision',
      label: t('steps.decisionMemory'),
      status: 'upcoming' as const,
    },
  ];

  return (
    <section
      className={cn(
        'rounded-2xl border border-border/60 bg-muted/20 px-5 py-5 sm:px-7',
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {t('roadmapLabel')}
      </p>
      <p className="mt-2 text-[15px] font-medium leading-relaxed">{t('roadmapLead')}</p>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3 text-sm">
            {item.status === 'active' ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            ) : item.status === 'next' ? (
              <Circle className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            ) : (
              <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <div>
              <p className={cn(item.status === 'upcoming' && 'text-muted-foreground')}>{item.label}</p>
              {item.status === 'upcoming' ? (
                <p className="text-xs text-muted-foreground">{t('comingSoon')}</p>
              ) : null}
              {item.status === 'active' ? (
                <p className="text-xs text-primary">{t('workshopActiveHint')}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {showPrimaryAction && primaryActionLabel ? (
        <Button
          type="button"
          className="mt-5 w-full rounded-xl sm:w-auto"
          onClick={() => {
            document.getElementById('post-review-workshop')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          {primaryActionLabel}
        </Button>
      ) : null}
    </section>
  );
}
