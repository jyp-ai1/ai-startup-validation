'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

import type { InvestigationTopic, NextActionKind } from '../../lib/v2-next-action-engine';
import { isReviewStale } from '../../lib/v2-review-dirty-state';
import { type WorkflowStepId } from '../../lib/v2-workflow-steps';
import type { DecisionMemoryEntry } from '../../lib/v2-decision-memory-store';
import type { V2EvidenceField, V2ValidationEvidence } from '../../lib/v2-validation-store';
import { isEvidenceFieldFilled } from '../../lib/v2-validation-store';
import { getNextAction } from '../../lib/v2-next-action-engine';
import { V2AiPmDailyBrief } from './v2-ai-pm-daily-brief';
import { V2AiPmNotebook } from './v2-ai-pm-notebook';
import { V2AiUnderstandingChips } from './v2-ai-understanding-chips';
import { V2EvidenceDetailDrawer } from './v2-evidence-detail-drawer';
import { V2GuidedDemoCoach, type GuidedDemoStep } from './v2-guided-demo-coach';
import { V2ProjectGrowthStory } from './v2-project-growth-story';
import { V2ReviewSummary } from './v2-review-summary';
import { V2StickyNextAction } from './v2-sticky-next-action';
import { V2WhySourcesSection } from './v2-why-sources-section';
import { V2WorkspaceProjectHeader } from './v2-workspace-project-header';

type V2ThinkingWorkspaceMainProps = {
  activeStep: WorkflowStepId;
  evidence: V2ValidationEvidence;
  projectName: string;
  lastReviewAt: Date | null;
  reviewCount: number;
  phase: 'compose' | 'reviewing' | 'board' | 'followUp';
  hasIdea: boolean;
  investigationViewed: boolean;
  memoryEntries: DecisionMemoryEntry[];
  activeMemoryId?: string | null;
  readOnly?: boolean;
  dirtyHighlightField?: 'idea' | V2EvidenceField | null;
  dirtyFieldLabel?: string | null;
  onIdeaChange: (value: string) => void;
  onFieldConfirm: (field: V2EvidenceField, value: string) => void;
  onFieldDelete: (field: V2EvidenceField) => void;
  onGoToStep: (step: WorkflowStepId) => void;
  onReview: () => void;
  onInvestigationViewed: () => void;
  onSelectMemory?: (entryId: string) => void;
  guidedDemoStep?: GuidedDemoStep | null;
  onGuidedDemoAdvance?: () => void;
  showPhilosophy?: boolean;
};

const SECTION = 'space-y-10';

export function V2ThinkingWorkspaceMain({
  evidence,
  projectName,
  lastReviewAt,
  reviewCount,
  phase,
  hasIdea,
  investigationViewed,
  memoryEntries,
  activeMemoryId = null,
  readOnly = false,
  dirtyHighlightField = null,
  onIdeaChange,
  onFieldConfirm,
  onFieldDelete,
  onGoToStep,
  onReview,
  onInvestigationViewed,
  onSelectMemory,
  guidedDemoStep = null,
  onGuidedDemoAdvance,
}: V2ThinkingWorkspaceMainProps) {
  const tReview = useTranslations('workflow.v2.strategyWorkspace');
  const [drawerTopic, setDrawerTopic] = useState<InvestigationTopic | null>(null);

  const stale = isReviewStale(evidence, reviewCount);
  const needsInput =
    !hasIdea || !isEvidenceFieldFilled('pricing', evidence) || !isEvidenceFieldFilled('customer', evidence);

  const handleFillPricing = () => {
    onGoToStep('bm');
  };

  const handleFillIdea = () => {
    onGoToStep('idea');
  };

  const handleHealthAction = (kind: NextActionKind) => {
    switch (kind) {
      case 'fill-idea':
        handleFillIdea();
        break;
      case 'start-review':
      case 're-review':
        onReview();
        break;
      case 'fill-pricing':
        handleFillPricing();
        break;
      case 'view-investigation':
        onInvestigationViewed();
        document.getElementById('review-summary')?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'customer-validation':
        onGoToStep('customer');
        break;
      default:
        break;
    }
  };

  const handleStickyAction = () => {
    handleHealthAction(
      getNextAction({ evidence, reviewCount, hasIdea, investigationViewed }).kind,
    );
  };

  if (phase === 'reviewing') {
    return (
      <section className="flex min-h-[420px] flex-col items-center justify-center py-16 text-center lg:min-h-[480px]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
        <p className="mt-4 text-sm font-medium">{tReview('reviewing.title')}</p>
        <p className="mt-1 text-xs text-muted-foreground">{tReview('reviewing.hint')}</p>
      </section>
    );
  }

  return (
    <>
      <div className={cn(SECTION, 'pb-24 py-2 sm:py-4')}>
        <V2WorkspaceProjectHeader projectName={projectName} lastReviewAt={lastReviewAt} />

        <V2AiPmDailyBrief
          evidence={evidence}
          reviewCount={reviewCount}
          hasIdea={hasIdea}
          investigationViewed={investigationViewed}
          stale={stale}
          readOnly={readOnly}
          onContinue={handleStickyAction}
        />

        {guidedDemoStep && onGuidedDemoAdvance ? (
          <V2GuidedDemoCoach step={guidedDemoStep} onAdvance={onGuidedDemoAdvance} />
        ) : null}

        {needsInput ? (
          <V2AiUnderstandingChips
            evidence={evidence}
            readOnly={readOnly}
            highlightField={dirtyHighlightField}
            onIdeaChange={onIdeaChange}
            onFieldConfirm={onFieldConfirm}
            onFieldDelete={onFieldDelete}
          />
        ) : null}

        <V2ReviewSummary reviewCount={reviewCount} />

        <V2WhySourcesSection reviewCount={reviewCount} onOpenTopic={setDrawerTopic} />

        {reviewCount > 0 ? (
          <V2ProjectGrowthStory
            entries={memoryEntries}
            reviewCount={reviewCount}
            activeMemoryId={activeMemoryId}
            onSelect={onSelectMemory}
          />
        ) : null}

        <V2AiPmNotebook reviewCount={reviewCount} readOnly={readOnly} />
      </div>

      <V2StickyNextAction
        evidence={evidence}
        reviewCount={reviewCount}
        hasIdea={hasIdea}
        investigationViewed={investigationViewed}
        readOnly={readOnly}
        onAction={handleStickyAction}
      />

      <V2EvidenceDetailDrawer
        topic={drawerTopic}
        onClose={() => setDrawerTopic(null)}
        readOnly={readOnly}
        onFillPricing={() => {
          setDrawerTopic(null);
          handleFillPricing();
        }}
      />
    </>
  );
}
