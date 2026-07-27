'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

import type { InvestigationTopic, NextActionKind } from '../../lib/v2-next-action-engine';
import { getReviewFreshness, isReviewStale } from '../../lib/v2-review-dirty-state';
import { type WorkflowStepId } from '../../lib/v2-workflow-steps';
import type { DecisionMemoryEntry } from '../../lib/v2-decision-memory-store';
import type { V2EvidenceField, V2ValidationEvidence } from '../../lib/v2-validation-store';
import { V2AiPmDailyBrief } from './v2-ai-pm-daily-brief';
import { V2AiEvidenceSummary } from './v2-ai-evidence-summary';
import { V2AiUnderstandingChips } from './v2-ai-understanding-chips';
import { V2ProjectGrowthStory } from './v2-project-growth-story';
import { V2EvidenceDetailDrawer } from './v2-evidence-detail-drawer';
import { V2EvidenceLibraryPanel } from './v2-evidence-library-panel';
import { V2EvidenceSummaryStrip } from './v2-evidence-summary-strip';
import type { ChangedField } from '../../lib/v2-impact-analysis';
import { V2GuidedDemoCoach, type GuidedDemoStep } from './v2-guided-demo-coach';
import { getNextAction } from '../../lib/v2-next-action-engine';
import { V2ImpactAnalysisPanel } from './v2-impact-analysis-panel';
import { V2InvestigationBoard } from './v2-investigation-board';
import { V2ProjectHealthCard } from './v2-project-health-card';
import { V2RecentChangesFlow } from './v2-recent-changes-flow';
import { V2ReviewStaleBanner } from './v2-review-stale-banner';
import { V2StickyNextAction } from './v2-sticky-next-action';
import { V2ThinkingLoopHeader, type LoopPhase } from './v2-thinking-loop-header';
import { V2ThinkingMapStatus } from './v2-thinking-map-status';
import { V2WorkspacePhilosophyBanner } from './v2-workspace-philosophy-banner';
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

function resolveLoopPhase(reviewCount: number, investigationViewed: boolean): LoopPhase {
  if (reviewCount === 0) return 'thinking';
  if (!investigationViewed) return 'evidence';
  return 'decision';
}

export function V2ThinkingWorkspaceMain({
  activeStep,
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
  dirtyFieldLabel = null,
  onIdeaChange,
  onFieldConfirm,
  onFieldDelete,
  onGoToStep,
  onReview,
  onInvestigationViewed,
  onSelectMemory,
  guidedDemoStep = null,
  onGuidedDemoAdvance,
  showPhilosophy = true,
}: V2ThinkingWorkspaceMainProps) {
  const tReview = useTranslations('workflow.v2.strategyWorkspace');
  const [drawerTopic, setDrawerTopic] = useState<InvestigationTopic | null>(null);

  const stale = isReviewStale(evidence, reviewCount);
  const freshness = getReviewFreshness(evidence, reviewCount);
  const loopPhase = resolveLoopPhase(reviewCount, investigationViewed);

  const scrollTo = (id: string) => {
    window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleViewInvestigation = () => {
    onInvestigationViewed();
    scrollTo('review-board');
  };

  const handleFillPricing = () => {
    scrollTo('ai-understanding');
    onGoToStep('bm');
  };

  const handleFillIdea = () => {
    scrollTo('ai-understanding');
    onGoToStep('idea');
  };

  const handleCustomerValidation = () => {
    scrollTo('ai-understanding');
    onGoToStep('customer');
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
        handleViewInvestigation();
        break;
      case 'customer-validation':
        handleCustomerValidation();
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
          readOnly={readOnly}
          onContinue={handleStickyAction}
        />

        {guidedDemoStep && onGuidedDemoAdvance ? (
          <V2GuidedDemoCoach step={guidedDemoStep} onAdvance={onGuidedDemoAdvance} />
        ) : null}

        {stale ? (
          <>
            <V2ImpactAnalysisPanel
              changedField={(dirtyHighlightField as ChangedField | null) ?? null}
              isStale={stale}
            />
            <V2ReviewStaleBanner
              onReReview={onReview}
              changedFieldLabel={dirtyFieldLabel}
              readOnly={readOnly}
            />
          </>
        ) : null}

        <V2InvestigationBoard
          evidence={evidence}
          reviewCount={reviewCount}
          isStale={stale}
          changedField={(dirtyHighlightField as ChangedField | null) ?? null}
          readOnly={readOnly}
          onOpenTopic={setDrawerTopic}
          onFillPricing={handleFillPricing}
          onOpenEvidenceLibrary={() => scrollTo('evidence-library')}
        />

        {reviewCount > 0 ? (
          <V2EvidenceSummaryStrip reviewCount={reviewCount} onOpenTopic={setDrawerTopic} />
        ) : null}

        <V2EvidenceLibraryPanel reviewCount={reviewCount} />

        {reviewCount > 0 ? (
          <V2ProjectGrowthStory
            entries={memoryEntries}
            reviewCount={reviewCount}
            activeMemoryId={activeMemoryId}
            onSelect={onSelectMemory}
          />
        ) : null}

        <details className="rounded-lg border border-border/40">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-muted-foreground">
            {tReview('advancedSection')}
          </summary>
          <div className="space-y-10 border-t border-border/40 px-4 py-4">
            {showPhilosophy ? (
              <V2WorkspacePhilosophyBanner activePhase={loopPhase} />
            ) : null}

            <V2ProjectHealthCard
              evidence={evidence}
              reviewCount={reviewCount}
              hasIdea={hasIdea}
              investigationViewed={investigationViewed}
              readOnly={readOnly}
              onAction={handleHealthAction}
            />

            <V2ThinkingLoopHeader activePhase={loopPhase} reviewFreshness={freshness} />

            <V2ThinkingMapStatus
              activeStep={activeStep}
              evidence={evidence}
              reviewCount={reviewCount}
              onSelect={onGoToStep}
            />

            <V2AiUnderstandingChips
              evidence={evidence}
              readOnly={readOnly}
              highlightField={dirtyHighlightField}
              onIdeaChange={onIdeaChange}
              onFieldConfirm={onFieldConfirm}
              onFieldDelete={onFieldDelete}
            />

            <V2RecentChangesFlow reviewCount={reviewCount} />
          </div>
        </details>

        <div className="xl:hidden">
          <V2AiEvidenceSummary
            evidence={evidence}
            reviewCount={reviewCount}
            hasIdea={hasIdea}
            investigationViewed={investigationViewed}
            lastReviewAt={lastReviewAt}
            memoryEntries={memoryEntries}
          />
        </div>
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

export { V2AiEvidenceSummary };
