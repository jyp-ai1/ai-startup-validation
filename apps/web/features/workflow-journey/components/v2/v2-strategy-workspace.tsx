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
  GTM_DEMO_EVIDENCE,
  GTM_DEMO_MEMORY,
  GTM_DEMO_OPTIONAL,
} from '../../lib/v2-gtm-demo';
import {
  type V2EvidenceField,
  type V2ValidationEvidence,
  isEvidenceFieldFilled,
  loadV2Validation,
  saveV2Validation,
} from '../../lib/v2-validation-store';
import { type WorkflowStepId } from '../../lib/v2-workflow-steps';
import { saveReviewSnapshot } from '../../lib/v2-review-dirty-state';
import { JourneyLayout } from '../journey-layout';
import { V2DecisionMemoryDetail } from './v2-decision-memory-detail';
import { V2DecisionSavePrompt } from './v2-decision-save-prompt';
import { V2DemoReadonlyBanner } from './v2-demo-readonly-banner';
import {
  resolveGuidedDemoStep,
  type GuidedDemoStep,
} from './v2-guided-demo-coach';
import {
  createNotebookFromReview,
} from '../../lib/v2-ai-pm-notebook-store';
import {
  NOTEBOOK_DEFAULT_AI_MEMO,
  NOTEBOOK_DEFAULT_FINDINGS,
} from '../../lib/v2-why-sources-data';
import { V2ThinkingWorkspaceMain } from './v2-thinking-workspace-main';

type WorkspacePhase = 'compose' | 'reviewing' | 'board' | 'followUp';

const REVIEW_MS = 3200;
const PANEL = 'min-h-[420px] rounded-2xl bg-muted/20 p-6 sm:p-8 lg:min-h-[480px]';

const STEP_SECTION_ID: Partial<Record<WorkflowStepId, string>> = {
  idea: 'ai-understanding',
  problem: 'ai-understanding',
  customer: 'ai-understanding',
  bm: 'ai-understanding',
  mvp: 'ai-understanding',
  market: 'review-board',
  competition: 'review-board',
  review: 'review-board',
};

function deriveProjectName(idea: string): string {
  const trimmed = idea.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 36) return trimmed;
  return `${trimmed.slice(0, 33).trim()}…`;
}

const GUIDED_DEMO_IDEA = 'AI가 사업 아이디어를 검증해주는 SaaS';
const GUIDED_DEMO_CUSTOMER_BEFORE = '예비창업자';
const GUIDED_DEMO_CUSTOMER_AFTER = '스타트업 대표 · PM';

type V2StrategyWorkspaceMode = 'default' | 'demo-readonly' | 'demo-guided';

type V2StrategyWorkspaceViewProps = {
  mode?: V2StrategyWorkspaceMode;
};

export function V2StrategyWorkspaceView({ mode = 'default' }: V2StrategyWorkspaceViewProps) {
  const isDemoReadonly = mode === 'demo-readonly';
  const isDemoGuided = mode === 'demo-guided';
  const isDemoNoPersist = isDemoReadonly || isDemoGuided;
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
  const [reviewCount, setReviewCount] = useState(0);
  const [followUpDone, setFollowUpDone] = useState(false);
  const [lastReviewAt, setLastReviewAt] = useState<Date | null>(
    isDemoReadonly ? new Date('2026-07-27T00:00:00.000Z') : null,
  );
  const [investigationViewed, setInvestigationViewed] = useState(isDemoReadonly);
  const [dirtyHighlightField, setDirtyHighlightField] = useState<
    'idea' | V2EvidenceField | null
  >(null);
  const [dirtyFieldLabel, setDirtyFieldLabel] = useState<string | null>(null);
  const [guidedStarted, setGuidedStarted] = useState(false);
  const [guidedCustomerChanged, setGuidedCustomerChanged] = useState(false);

  const refreshMemory = useCallback(() => {
    setMemoryEntries(loadDecisionMemory());
  }, []);

  useEffect(() => {
    if (isDemoReadonly) {
      setIdea(GTM_DEMO_EVIDENCE.idea);
      setOptional({ ...GTM_DEMO_OPTIONAL });
      setReviewCount(1);
      setPhase('board');
      setActiveStep('review');
      setFollowUpDone(true);
      setMemoryEntries(GTM_DEMO_MEMORY);
      saveReviewSnapshot(GTM_DEMO_EVIDENCE);
      createNotebookFromReview(1, [...NOTEBOOK_DEFAULT_FINDINGS], NOTEBOOK_DEFAULT_AI_MEMO);
      return;
    }

    if (isDemoGuided) {
      setOptional({
        problem: '창업자가 어디서부터 사업을 검토해야 할지 모름',
        customer: GUIDED_DEMO_CUSTOMER_BEFORE,
        mvp: '',
        pricing: '',
      });
      return;
    }

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
  }, [isDemoReadonly, isDemoGuided, refreshMemory]);

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
    !isDemoNoPersist &&
    reviewCount > 0 &&
    phase !== 'reviewing' &&
    activeMemoryId == null &&
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
    if (isDemoNoPersist) return;
    saveV2Validation(next);
  }, [isDemoNoPersist]);

  const markDirty = (field: 'idea' | V2EvidenceField) => {
    if (reviewCount < 1) return;
    setDirtyHighlightField(field);
    setDirtyFieldLabel(tb(field === 'idea' ? 'step.idea' : `fields.${field}`));
  };

  const handleFieldConfirm = (field: V2EvidenceField, value: string) => {
    if (isDemoReadonly) return;
    setOptional((prev) => {
      const next = { ...prev, [field]: value };
      persist({ ...evidence, [field]: value });
      return next;
    });
    if (isDemoGuided && field === 'customer' && value.includes('스타트업')) {
      setGuidedCustomerChanged(true);
    }
    markDirty(field);
    if (!isDemoGuided) {
      appToast.success(tb('toast.saved', { field: tb(`fields.${field}`) }));
    }
  };

  const handleIdeaChange = (value: string) => {
    if (isDemoReadonly) return;
    setIdea(value);
    persist({
      ...evidence,
      idea: value.trim(),
    });
    markDirty('idea');
  };

  const handleFieldDelete = (field: V2EvidenceField) => {
    if (isDemoReadonly) return;
    setOptional((prev) => {
      const next = { ...prev, [field]: '' };
      persist({ ...evidence, [field]: undefined });
      return next;
    });
    markDirty(field);
    appToast.success(tb('toast.deleted', { field: tb(`fields.${field}`) }));
  };

  const runReview = useCallback(() => {
    if (isDemoReadonly || !hasIdea) return;
    persist(evidence);
    setPhase('reviewing');
    setReviewCount((c) => c + 1);
    setFollowUpDone(false);
    setActiveMemoryId(null);
    setLastReviewAt(new Date());

    window.setTimeout(() => {
      setPhase('board');
      setActiveStep('review');
      saveReviewSnapshot(evidence);
      setInvestigationViewed(false);
      setDirtyHighlightField(null);
      setDirtyFieldLabel(null);
      createNotebookFromReview(
        reviewCount + 1,
        [...NOTEBOOK_DEFAULT_FINDINGS],
        NOTEBOOK_DEFAULT_AI_MEMO,
      );
      window.setTimeout(() => setPhase('followUp'), 400);
    }, REVIEW_MS);
  }, [evidence, hasIdea, isDemoReadonly, persist, reviewCount]);

  const handleGoToStep = (step: WorkflowStepId) => {
    setActiveMemoryId(null);
    setActiveStep(step);
    const sectionId = STEP_SECTION_ID[step] ?? 'thinking-map-status';
    window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleSelectMemory = (entryId: string) => {
    setActiveMemoryId(entryId);
  };

  const handleSaveMemory = () => {
    if (isDemoReadonly) return;
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

  const projectName = isDemoReadonly
    ? 'AI SaaS 검토'
    : isDemoGuided
      ? '데모 체험'
      : deriveProjectName(idea) || deriveProjectName(evidence.idea);

  const guidedDemoStep: GuidedDemoStep | null = isDemoGuided
    ? resolveGuidedDemoStep({
        step: !guidedStarted ? 'welcome' : 'idea',
        hasIdea,
        reviewCount,
        customerChanged: guidedCustomerChanged,
      })
    : null;

  const handleGuidedAdvance = () => {
    if (!isDemoGuided) return;
    if (!guidedStarted) {
      setGuidedStarted(true);
      setIdea(GUIDED_DEMO_IDEA);
      return;
    }
    if (guidedDemoStep === 'customer') {
      handleFieldConfirm('customer', GUIDED_DEMO_CUSTOMER_AFTER);
      markDirty('customer');
    }
  };

  return (
    <JourneyLayout phase="workflow" width="workspace" versionLabel="V2">
      <div className="mx-auto max-w-2xl">
        {isDemoReadonly ? <V2DemoReadonlyBanner /> : null}
        {isDemoGuided && guidedDemoStep === 'complete' ? (
          <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
            <p className="font-medium">체험 완료 — AI PM과 함께 검토를 마쳤습니다.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              로그인하면 프로젝트를 저장하고 이어서 진행할 수 있습니다.
            </p>
          </div>
        ) : null}
        {activeMemory ? (
          <section className={cn(PANEL, 'animate-in fade-in duration-300')}>
            <V2DecisionMemoryDetail entry={activeMemory} />
          </section>
        ) : (
          <V2ThinkingWorkspaceMain
              activeStep={activeStep}
              evidence={evidence}
              projectName={projectName}
              lastReviewAt={lastReviewAt}
              reviewCount={reviewCount}
              phase={phase}
              hasIdea={hasIdea}
              investigationViewed={investigationViewed}
              memoryEntries={memoryEntries}
              activeMemoryId={activeMemoryId}
              readOnly={isDemoReadonly}
              dirtyHighlightField={dirtyHighlightField}
              dirtyFieldLabel={dirtyFieldLabel}
              onIdeaChange={handleIdeaChange}
              onFieldConfirm={handleFieldConfirm}
              onFieldDelete={handleFieldDelete}
              onGoToStep={handleGoToStep}
              onReview={runReview}
              onInvestigationViewed={() => setInvestigationViewed(true)}
              onSelectMemory={handleSelectMemory}
              guidedDemoStep={guidedDemoStep === 'complete' ? null : guidedDemoStep}
              onGuidedDemoAdvance={isDemoGuided ? handleGuidedAdvance : undefined}
              showPhilosophy
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
    </JourneyLayout>
  );
}
