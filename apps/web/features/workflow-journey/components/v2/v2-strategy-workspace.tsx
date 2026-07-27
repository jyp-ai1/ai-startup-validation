'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { appToast } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  type DecisionMemoryEntry,
  buildDraftFromReview,
  commitDecisionEntry,
  loadDecisionMemory,
} from '../../lib/v2-decision-memory-store';
import {
  type V2EvidenceField,
  type V2ValidationEvidence,
  isEvidenceFieldFilled,
  loadV2Validation,
  saveV2Validation,
} from '../../lib/v2-validation-store';
import { type WorkflowStepId } from '../../lib/v2-workflow-steps';
import { JourneyLayout } from '../journey-layout';
import { V2AiSummaryPanel } from './v2-ai-summary-panel';
import { V2DecisionMemoryDetail } from './v2-decision-memory-detail';
import { V2DecisionSavePrompt } from './v2-decision-save-prompt';
import { V2MainWorkspacePanel } from './v2-main-workspace-panel';
import { V2WorkflowNav } from './v2-workflow-nav';

type WorkspacePhase = 'compose' | 'reviewing' | 'board' | 'followUp';

const REVIEW_MS = 3200;
const PANEL = 'min-h-[420px] rounded-2xl bg-muted/20 p-6 sm:p-8 lg:min-h-[480px]';

export function V2StrategyWorkspaceView() {
  const tb = useTranslations('workflow.v2.reviewBoard');
  const td = useTranslations('workflow.v2.strategyWorkspace.decisionMemory');
  const tDraft = useTranslations('workflow.v2.strategyWorkspace.decisionMemory.draft');

  const [phase, setPhase] = useState<WorkspacePhase>('compose');
  const [activeStep, setActiveStep] = useState<WorkflowStepId>('idea');
  const [activeMemoryId, setActiveMemoryId] = useState<string | null>(null);
  const [memoryEntries, setMemoryEntries] = useState<DecisionMemoryEntry[]>([]);
  const [savedReviewRound, setSavedReviewRound] = useState(0);
  const [dismissedReviewRound, setDismissedReviewRound] = useState(0);

  const [idea, setIdea] = useState('');
  const [optional, setOptional] = useState<Record<V2EvidenceField, string>>({
    problem: '',
    customer: '',
    mvp: '',
    pricing: '',
  });
  const [activeField, setActiveField] = useState<V2EvidenceField | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [followUpAnswer, setFollowUpAnswer] = useState('');
  const [followUpDone, setFollowUpDone] = useState(false);

  const refreshMemory = useCallback(() => {
    setMemoryEntries(loadDecisionMemory());
  }, []);

  useEffect(() => {
    refreshMemory();
    const saved = loadV2Validation();
    if (!saved) return;
    setIdea(saved.evidence.idea);
    setOptional({
      problem: saved.evidence.problem ?? '',
      customer: saved.evidence.customer ?? '',
      mvp: saved.evidence.mvp ?? '',
      pricing: saved.evidence.pricing ?? '',
    });
  }, [refreshMemory]);

  const evidence = useMemo(
    (): V2ValidationEvidence => ({
      idea: idea.trim(),
      problem: optional.problem.trim() || undefined,
      customer: optional.customer.trim() || undefined,
      mvp: optional.mvp.trim() || undefined,
      pricing: optional.pricing.trim() || undefined,
    }),
    [idea, optional],
  );

  const hasIdea = isEvidenceFieldFilled('idea', evidence);
  const activeMemory = useMemo(
    () => memoryEntries.find((entry) => entry.id === activeMemoryId) ?? null,
    [activeMemoryId, memoryEntries],
  );

  const memoryDraft = useMemo(
    () => buildDraftFromReview(evidence, reviewCount),
    [evidence, reviewCount],
  );

  const showSavePrompt =
    reviewCount > 0 &&
    phase !== 'reviewing' &&
    activeMemoryId == null &&
    activeStep === 'review' &&
    memoryDraft != null &&
    savedReviewRound < reviewCount &&
    dismissedReviewRound < reviewCount &&
    (followUpDone || phase === 'followUp' || phase === 'board');

  const evidenceLabelMap = useMemo(
    () => ({
      marketResearch: tDraft('evidence.marketResearch'),
      interviews: tDraft('evidence.interviews'),
      competitors: tDraft('evidence.competitors'),
      problemInput: tDraft('evidence.problemInput'),
      pricingInput: tDraft('evidence.pricingInput'),
    }),
    [tDraft],
  );

  const reasonLabelMap = useMemo(
    () => ({
      initialReview: tDraft('reason.initialReview'),
      problem: tDraft('reason.problem'),
      customer: tDraft('reason.customer'),
      market: tDraft('reason.market'),
    }),
    [tDraft],
  );

  const resolveDraftReason = useCallback(
    (reasonKey: string) => {
      if (reasonKey === 'initialReview') return reasonLabelMap.initialReview;
      return reasonKey
        .split('+')
        .map((key) => reasonLabelMap[key as keyof typeof reasonLabelMap] ?? key)
        .join('\n');
    },
    [reasonLabelMap],
  );

  const persist = useCallback((next: V2ValidationEvidence) => {
    saveV2Validation(next);
  }, []);

  const handleFieldConfirm = (field: V2EvidenceField, value: string) => {
    setOptional((prev) => {
      const next = { ...prev, [field]: value };
      persist({ ...evidence, [field]: value });
      return next;
    });
    setActiveField(null);
    appToast.success(tb('toast.saved', { field: tb(`fields.${field}`) }));
  };

  const handleFieldDelete = (field: V2EvidenceField) => {
    setOptional((prev) => {
      const next = { ...prev, [field]: '' };
      persist({ ...evidence, [field]: undefined });
      return next;
    });
    appToast.success(tb('toast.deleted', { field: tb(`fields.${field}`) }));
  };

  const runReview = useCallback(() => {
    if (!hasIdea) return;
    persist(evidence);
    setPhase('reviewing');
    setReviewCount((c) => c + 1);
    setFollowUpDone(false);
    setActiveMemoryId(null);

    window.setTimeout(() => {
      setPhase('board');
      setActiveStep('review');
      window.setTimeout(() => setPhase('followUp'), 400);
    }, REVIEW_MS);
  }, [evidence, hasIdea, persist]);

  const handleFollowUpSubmit = () => {
    const trimmed = followUpAnswer.trim();
    if (trimmed.length < 2) return;
    const enriched = optional.customer.trim()
      ? `${optional.customer}\n\n[결제 주체] ${trimmed}`
      : trimmed;
    setOptional((prev) => ({ ...prev, customer: enriched }));
    persist({ ...evidence, customer: enriched });
    setFollowUpDone(true);
    setFollowUpAnswer('');
    appToast.success(tb('toast.updated'));
  };

  const handleGoToStep = (step: WorkflowStepId) => {
    setActiveField(null);
    setActiveMemoryId(null);
    setActiveStep(step);
  };

  const handleSelectMemory = (entryId: string) => {
    setActiveField(null);
    setActiveMemoryId(entryId);
  };

  const handleSaveMemory = () => {
    if (!memoryDraft) return;
    const entry = commitDecisionEntry(
      memoryDraft.decision,
      resolveDraftReason(memoryDraft.reason),
      memoryDraft.evidence.map((key) => evidenceLabelMap[key as keyof typeof evidenceLabelMap] ?? key),
    );
    refreshMemory();
    setSavedReviewRound(reviewCount);
    setActiveMemoryId(entry.id);
    appToast.success(td('toast.saved'));
  };

  const handleLaterMemory = () => {
    setDismissedReviewRound(reviewCount);
  };

  return (
    <JourneyLayout phase="workflow" width="workspace" versionLabel="V2">
      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[minmax(0,240px)_minmax(0,1fr)_minmax(0,280px)] xl:gap-12">
        <div className="order-2 lg:order-1">
          <V2WorkflowNav
            activeStep={activeStep}
            activeMemoryId={activeMemoryId}
            memoryEntries={memoryEntries}
            evidence={evidence}
            reviewCount={reviewCount}
            onSelect={handleGoToStep}
            onSelectMemory={handleSelectMemory}
          />
        </div>

        <div className="order-1 min-w-0 space-y-6 lg:order-2">
          {activeMemory ? (
            <section className={cn(PANEL, 'animate-in fade-in duration-300')}>
              <V2DecisionMemoryDetail entry={activeMemory} />
            </section>
          ) : (
            <V2MainWorkspacePanel
              activeStep={activeStep}
              evidence={evidence}
              idea={idea}
              optional={optional}
              reviewCount={reviewCount}
              phase={phase}
              followUpAnswer={followUpAnswer}
              followUpDone={followUpDone}
              onIdeaChange={setIdea}
              onFieldConfirm={handleFieldConfirm}
              onFieldDelete={handleFieldDelete}
              onOpenField={setActiveField}
              activeField={activeField}
              onCloseField={() => setActiveField(null)}
              onReview={runReview}
              onFollowUpChange={setFollowUpAnswer}
              onFollowUpSubmit={handleFollowUpSubmit}
              onGoToStep={handleGoToStep}
              hasIdea={hasIdea}
            />
          )}

          {showSavePrompt && memoryDraft ? (
            <V2DecisionSavePrompt
              draft={memoryDraft}
              evidenceLabels={evidenceLabelMap}
              reasonLabels={reasonLabelMap}
              onSave={handleSaveMemory}
              onLater={handleLaterMemory}
            />
          ) : null}
        </div>

        <div className="order-3 hidden xl:block">
          <V2AiSummaryPanel
            evidence={evidence}
            reviewCount={reviewCount}
            onGoToStep={handleGoToStep}
            onReview={runReview}
            hasIdea={hasIdea}
          />
        </div>
      </div>

      <div className="mt-10 border-t border-border/40 pt-8 xl:hidden">
        <V2AiSummaryPanel
          evidence={evidence}
          reviewCount={reviewCount}
          onGoToStep={handleGoToStep}
          onReview={runReview}
          hasIdea={hasIdea}
        />
      </div>
    </JourneyLayout>
  );
}
