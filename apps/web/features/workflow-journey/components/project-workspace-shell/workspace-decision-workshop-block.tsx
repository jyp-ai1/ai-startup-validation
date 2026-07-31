'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';
import type { MarketAlignmentState, MarketCandidate } from '../../lib/business-understanding/workspace-alignment';
import {
  resolvePostReviewWorkshopPlan,
  saveWorkshopAgreement,
  type WorkshopTopicId,
} from '../../lib/business-understanding/workspace-decision-workshop';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

type WorkspaceDecisionWorkshopBlockProps = {
  understanding: BusinessUnderstanding;
  alignment: MarketAlignmentState | null;
  candidates: MarketCandidate[];
  reviewCount: number;
  projectId?: string;
  readOnly?: boolean;
  onAgreed?: (topicLabel: string) => void;
  className?: string;
};

export function WorkspaceDecisionWorkshopBlock({
  understanding,
  alignment,
  candidates,
  reviewCount,
  projectId,
  readOnly = false,
  onAgreed,
  className,
}: WorkspaceDecisionWorkshopBlockProps) {
  const tw = useTranslations('workflow.journey.workspaceShell.decisionWorkshop');
  const plan = useMemo(
    () => resolvePostReviewWorkshopPlan(understanding, alignment, candidates),
    [understanding, alignment, candidates],
  );

  const [topicId, setTopicId] = useState<WorkshopTopicId>(plan.topicId);
  const [showAlternates, setShowAlternates] = useState(false);
  const [customDraft, setCustomDraft] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const topicLabel = showCustom && customDraft.trim()
    ? customDraft.trim()
    : tw(`topics.${topicId}`);

  const insight = tw(`insights.${plan.insightKind}`);

  const handleAgree = () => {
    const label = showCustom ? customDraft.trim() : tw(`topics.${topicId}`);
    if (showCustom && label.length < 2) return;
    saveWorkshopAgreement(
      {
        reviewRound: reviewCount,
        topicId: showCustom ? 'market_entry' : topicId,
        customLabel: showCustom ? label : null,
        agreed: true,
      },
      projectId,
    );
    setAgreed(true);
    onAgreed?.(label);
  };

  if (agreed) {
    return (
      <section
        className={cn(
          'rounded-2xl border border-primary/25 bg-primary/[0.03] px-5 py-5 sm:px-7',
          className,
        )}
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
          {tw('aiLabel')}
        </p>
        <p className="mt-3 text-[15px] leading-relaxed">{tw('workshopStartAck', { topic: topicLabel })}</p>
      </section>
    );
  }

  return (
    <section
      className={cn(
        'rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.04] to-background px-5 py-5 sm:px-7',
        className,
      )}
    >
      <div className="space-y-5 text-[15px] leading-relaxed">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
            {tw('aiLabel')}
          </p>
          <p className="mt-3 text-sm font-medium text-muted-foreground">{tw('insightLead')}</p>
          <p className="mt-2">{insight}</p>
        </div>

        <div className="rounded-xl border border-border/50 bg-background/80 px-4 py-4">
          <p>{tw('candidateInvite', { topic: tw(`topics.${topicId}`) })}</p>
        </div>

        {!showAlternates && !showCustom ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button type="button" className="rounded-xl" disabled={readOnly} onClick={handleAgree}>
              {tw('agreeTopic')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={readOnly}
              onClick={() => setShowAlternates(true)}
            >
              {tw('chooseOtherTopic')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={readOnly}
              onClick={() => {
                setShowCustom(true);
                setShowAlternates(false);
              }}
            >
              {tw('customInput')}
            </Button>
          </div>
        ) : null}

        {showAlternates ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">{tw('otherTopicLead')}</p>
            {plan.alternateTopicIds.map((id) => (
              <button
                key={id}
                type="button"
                disabled={readOnly}
                onClick={() => {
                  setTopicId(id);
                  setShowAlternates(false);
                }}
                className="flex w-full rounded-xl border border-border/60 px-4 py-3 text-left transition-colors hover:border-primary/40"
              >
                {tw(`topics.${id}`)}
              </button>
            ))}
            <Button
              type="button"
              className="mt-2 rounded-xl"
              disabled={readOnly}
              onClick={handleAgree}
            >
              {tw('agreeTopic')}
            </Button>
          </div>
        ) : null}

        {showCustom ? (
          <div className="space-y-2">
            <input
              value={customDraft}
              readOnly={readOnly}
              onChange={(e) => setCustomDraft(e.target.value)}
              placeholder={tw('customPlaceholder')}
              className="w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm outline-none focus:border-primary/40"
            />
            <Button
              type="button"
              className="rounded-xl"
              disabled={readOnly || customDraft.trim().length < 2}
              onClick={handleAgree}
            >
              {tw('agreeTopic')}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
