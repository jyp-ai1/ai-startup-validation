'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';
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
import { createMeetingNoteFromReview } from '../../lib/v2-ai-pm-meeting-store';
import {
  ProjectWorkspaceShell,
  WorkspaceAiPmMain,
  WorkspaceProgressiveOverview,
  buildWorkspaceSidebarSnapshot,
  type WorkspaceMainView,
  type WorkspaceNavNodeId,
} from '../project-workspace-shell';
import { V2DecisionMemoryDetail } from './v2-decision-memory-detail';
import { sanitizeAiPmResponse, sanitizeDocumentLabel, sanitizeAiPmParagraphs } from '@/lib/ai/ai-response-sanitizer';
import type { AppAuthUser } from '@/lib/auth/server-auth';
import { V2DecisionSavePrompt } from './v2-decision-save-prompt';
import { V2DemoReadonlyBanner } from './v2-demo-readonly-banner';
import { V2DemoGuidedBanner } from './v2-demo-guided-banner';
import {
  buildAiPmPrimaryMessage,
  canProceedWorkspaceReview,
  emptyWorkspaceDomain,
  inferDomainFromPaste,
  loadWorkspaceDocumentText,
  loadWorkspaceDomain,
  loadWorkspaceEntities,
  saveWorkspaceDocumentText,
  saveWorkspaceDomain,
  saveWorkspaceEntities,
  validationToWorkspaceDomain,
  workspaceDomainToValidation,
  type WorkspaceDomainEvidence,
  type WorkspaceDomainFieldId,
} from '../../lib/workspace-ai-pm-messages';
import { loadUnderstandingPhase, clearBusinessUnderstandingConfirmed } from '../../lib/business-understanding/business-understanding-store';
import { allowsOpenReview, loadMarketAlignment } from '../../lib/business-understanding/workspace-alignment';
import { buildBusinessUnderstandingIntro, buildReviewTransitionMessage, buildBusinessUnderstanding, TASTE_COMPANY_FULL_SAMPLE } from '../../lib/business-understanding/build-business-understanding';
import { loadDemoProjectDraft } from '../../lib/v2-demo-project-store';

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

type V2StrategyWorkspaceMode = 'default' | 'demo-readonly' | 'demo-guided';

type V2StrategyWorkspaceViewProps = {
  mode?: V2StrategyWorkspaceMode;
  user?: AppAuthUser | null;
  projectId?: string;
};

export function V2StrategyWorkspaceView({
  mode = 'default',
  user = null,
  projectId,
}: V2StrategyWorkspaceViewProps) {
  const isDemoReadonly = mode === 'demo-readonly';
  const isDemoGuided = mode === 'demo-guided';
  const isDemoNoPersist = isDemoReadonly || isDemoGuided;
  const tb = useTranslations('workflow.v2.reviewBoard');
  const td = useTranslations('workflow.v2.strategyWorkspace.decisionMemory');
  const tDraft = useTranslations('workflow.v2.strategyWorkspace.decisionMemory.draft');
  const tDemo = useTranslations('workflow.journey.workspaceShell.demo');
  const tStrip = useTranslations('workflow.journey.workspaceShell.strip');

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
  const [mainView, setMainView] = useState<WorkspaceMainView>('ai-pm');
  const [activeNavNodeId, setActiveNavNodeId] = useState<WorkspaceNavNodeId | null>('founder');
  const [domain, setDomain] = useState<WorkspaceDomainEvidence>(() => emptyWorkspaceDomain());
  const [entities, setEntities] = useState<LaunchLensDomainContext | null>(null);
  const [understandingPhase, setUnderstandingPhase] = useState<
    ReturnType<typeof loadUnderstandingPhase>
  >('pending');

  useEffect(() => {
    if (reviewCount === 0) {
      setMainView('ai-pm');
    }
  }, [projectId, isDemoGuided, reviewCount]);

  useEffect(() => {
    if (reviewCount > 0) {
      setMainView('ai-pm');
    }
  }, [reviewCount]);

  const refreshUnderstandingState = useCallback(() => {
    setUnderstandingPhase(loadUnderstandingPhase(projectId));
  }, [projectId]);

  function markFieldUserConfirmed(
    prev: LaunchLensDomainContext | null,
    field: WorkspaceDomainFieldId,
    value: string,
  ): LaunchLensDomainContext {
    const base =
      prev ??
      ({
        founder: { value: null, basis: 'unknown' },
        business: { value: null, basis: 'unknown', model: null, name: null },
        customer: { value: null, basis: 'unknown' },
        product: { value: null, basis: 'unknown' },
        market: { value: null, basis: 'unknown' },
        competitor: { value: null, basis: 'unknown' },
      } satisfies LaunchLensDomainContext);

    if (field === 'business') {
      return {
        ...base,
        business: {
          ...base.business,
          value,
          name: value,
          basis: 'document',
          excerpt: null,
        },
      };
    }

    return {
      ...base,
      [field]: {
        ...(base[field] as { value: string | null; basis: string; excerpt?: string | null }),
        value,
        basis: 'document',
        excerpt: null,
      },
    };
  }

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
      saveReviewSnapshot(GTM_DEMO_EVIDENCE, 'demo');
      createMeetingNoteFromReview(1);
      return;
    }

    if (isDemoGuided) {
      clearBusinessUnderstandingConfirmed(projectId);
      const sample = TASTE_COMPANY_FULL_SAMPLE;
      saveWorkspaceDocumentText(sample, projectId);
      const inferred = inferDomainFromPaste(sample, projectId);
      setDomain(inferred.domain);
      setEntities(inferred.entities);
      setIdea(inferred.domain.business);
      setOptional({
        problem: '전통주 관광 시장에서 고객·파트너 정의가 아직 분산되어 있음',
        customer: '',
        mvp: '',
        pricing: '',
      });
      refreshUnderstandingState();
      return;
    }

    refreshMemory();
    refreshUnderstandingState();
    const saved = loadV2Validation();
    const storedDomain = loadWorkspaceDomain(projectId);
    const storedEntities = loadWorkspaceEntities(projectId);

    const demoDraft = loadDemoProjectDraft();
    const pastedContent = demoDraft?.pastedContent?.trim();
    if (!loadWorkspaceDocumentText(projectId)) {
      if (pastedContent && pastedContent.length >= 8) {
        const inferred = inferDomainFromPaste(pastedContent, projectId);
        if (!storedDomain) {
          setDomain(inferred.domain);
        }
        if (!storedEntities) {
          setEntities(inferred.entities);
        }
      } else if (saved) {
        const combined = [
          saved.evidence.idea,
          saved.evidence.problem,
          saved.evidence.customer,
          saved.evidence.mvp,
          saved.evidence.pricing,
        ]
          .filter(Boolean)
          .join('\n');
        if (combined.length >= 8) {
          saveWorkspaceDocumentText(combined, projectId);
        }
      }
    }

    if (storedDomain) {
      setDomain(storedDomain);
    }
    if (storedEntities) {
      setEntities(storedEntities);
    }
    if (!saved) return;
    setIdea(saved.evidence.idea);
    setOptional({
      problem: saved.evidence.problem ?? '',
      customer: saved.evidence.customer ?? '',
      mvp: saved.evidence.mvp ?? '',
      pricing: saved.evidence.pricing ?? '',
    });
    if (!storedDomain) {
      setDomain(validationToWorkspaceDomain(saved.evidence));
    }
  }, [isDemoReadonly, isDemoGuided, refreshMemory, projectId, refreshUnderstandingState]);

  const aiPmMessage = useMemo(
    () => buildAiPmPrimaryMessage(domain, reviewCount, entities),
    [domain, reviewCount, entities],
  );

  const evidence = useMemo(
    (): V2ValidationEvidence => ({
      idea: domain.business.trim() || idea.trim(),
      problem: optional.problem.trim() || undefined,
      customer: domain.customer.trim() || optional.customer.trim() || undefined,
      mvp: optional.mvp.trim() || undefined,
      pricing: optional.pricing.trim() || undefined,
    }),
    [domain, idea, optional],
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

  const handleAlignmentApplied = useCallback(
    (
      nextDomain: WorkspaceDomainEvidence,
      nextEntities: LaunchLensDomainContext,
      customer: string,
    ) => {
      if (isDemoReadonly) return;
      setDomain(nextDomain);
      setEntities(nextEntities);
      saveWorkspaceDomain(nextDomain, projectId);
      saveWorkspaceEntities(nextEntities, projectId);
      setOptional((prev) => ({ ...prev, customer }));
      persist({
        ...evidence,
        idea: nextDomain.business.trim(),
        customer: customer.trim() || undefined,
      });
    },
    [evidence, isDemoReadonly, persist, projectId],
  );

  const handleDomainChange = (field: WorkspaceDomainFieldId, value: string) => {
    if (isDemoReadonly) return;
    setDomain((prev) => {
      const next = { ...prev, [field]: value };
      saveWorkspaceDomain(next, projectId);
      const mapped = workspaceDomainToValidation(next);
      if (field === 'business') {
        setIdea(mapped.idea);
      }
      if (field === 'customer') {
        setOptional((o) => ({ ...o, customer: value }));
      }
      persist({
        ...evidence,
        idea: mapped.idea,
        customer: mapped.customer,
      });
      if (field === 'business') markDirty('idea');
      if (field === 'customer') markDirty('customer');
      return next;
    });
    setEntities((prev) => {
      const next = markFieldUserConfirmed(prev, field, value);
      saveWorkspaceEntities(next, projectId);
      return next;
    });
  };

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
    const canStartReview = understandingPhase === 'review-ready';
    const alignment = loadMarketAlignment(projectId);
    const openReview = allowsOpenReview(alignment);
    if (
      isDemoReadonly ||
      !canStartReview ||
      (!openReview && !canProceedWorkspaceReview(domain, entities))
    ) {
      return;
    }
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
      createMeetingNoteFromReview(reviewCount + 1);
      window.setTimeout(() => setPhase('followUp'), 400);
    }, REVIEW_MS);
  }, [domain, entities, evidence, isDemoReadonly, persist, projectId, reviewCount, understandingPhase]);

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
      ? tDemo('sampleProjectName')
      : domain.business.trim() || deriveProjectName(idea) || deriveProjectName(evidence.idea);

  const showDemoLoginCta =
    isDemoGuided && (!user?.email?.trim() || user.id === 'demo-guest');

  const understandingAligned = understandingPhase === 'review-ready';

  const documentContext = useMemo(() => {
    const stored = loadWorkspaceDocumentText(projectId);
    if (stored?.trim()) return stored;
    return [domain.business, domain.founder, domain.customer, domain.market]
      .filter(Boolean)
      .join('\n');
  }, [domain, projectId]);

  const businessUnderstanding = useMemo(
    () => (documentContext.trim().length >= 8 ? buildBusinessUnderstanding(documentContext) : null),
    [documentContext],
  );

  const sidebarSnapshot = useMemo(
    () =>
      buildWorkspaceSidebarSnapshot(
        domain,
        reviewCount,
        entities,
        understandingAligned,
        businessUnderstanding,
        understandingPhase,
      ),
    [domain, reviewCount, entities, understandingAligned, businessUnderstanding, understandingPhase],
  );

  const stripMessage = useMemo(() => {
    if (reviewCount > 0) {
      return sanitizeAiPmResponse(tStrip('reviewComplete'));
    }
    if (understandingPhase === 'pending') {
      return sanitizeAiPmResponse(buildBusinessUnderstandingIntro());
    }
    if (understandingPhase === 'aligning') {
      return sanitizeAiPmResponse('같은 그림을 보고 있는지 확인하겠습니다.');
    }
    if (understandingPhase === 'review-ready') {
      return sanitizeAiPmResponse(buildReviewTransitionMessage());
    }
    if (understandingPhase === 'edit' || understandingPhase === 'together') {
      return sanitizeAiPmResponse(buildBusinessUnderstandingIntro());
    }
    return sanitizeAiPmResponse(aiPmMessage.paragraphs.join(' '));
  }, [understandingPhase, reviewCount, aiPmMessage, tStrip]);

  const workspaceMain = (
    <>
      {isDemoReadonly ? <V2DemoReadonlyBanner /> : null}
      {isDemoGuided ? <V2DemoGuidedBanner /> : null}
      {mainView === 'overview' ? (
        <WorkspaceProgressiveOverview
          businessScore={sidebarSnapshot.businessScore}
          reviewCount={reviewCount}
          completedTopics={sidebarSnapshot.completedTopics}
        />
      ) : activeMemory ? (
        <section className={cn(PANEL, 'animate-in fade-in duration-300')}>
          <V2DecisionMemoryDetail entry={activeMemory} />
        </section>
      ) : (
        <WorkspaceAiPmMain
          domain={domain}
          entities={entities}
          reviewCount={reviewCount}
          businessScore={sidebarSnapshot.businessScore}
          completedTopics={sidebarSnapshot.completedTopics}
          phase={phase}
          readOnly={isDemoReadonly}
          projectId={projectId}
          showDemoLoginCta={showDemoLoginCta}
          onAlignmentApplied={handleAlignmentApplied}
          onReview={runReview}
          onUnderstandingConfirmed={refreshUnderstandingState}
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
    </>
  );

  return (
    <ProjectWorkspaceShell
      projectName={projectName}
      demoBadge={isDemoGuided}
      user={user}
      sidebar={sidebarSnapshot}
      mainView={mainView}
      activeNodeId={activeNavNodeId}
      stripMessage={stripMessage}
      onMainViewChange={setMainView}
      onSelectNode={setActiveNavNodeId}
      onSelectAiPm={() => setMainView('ai-pm')}
    >
      {workspaceMain}
    </ProjectWorkspaceShell>
  );
}
