'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { runAnalysis } from '@/lib/analysis-engine';
import { buildConversationMemoryFromSources } from '../../lib/business-understanding/build-conversation-memory';
import { deriveEvidenceStatusFromMemory } from '../../lib/business-understanding/evidence-status';
import { mapEvidenceStatusToAnalysisInput } from '../../lib/business-understanding/map-evidence-to-analysis-input';
import { saveAnalysisResult } from '../../lib/business-understanding/analysis-result-store';
import { loadConversationMemory } from '../../lib/business-understanding/conversation-memory-store';
import {
  ProjectWorkspaceShell,
  WorkspaceAiPmMain,
  WorkspaceProgressiveOverview,
  type WorkspaceMainView,
  type WorkspaceNavNodeId,
} from '../project-workspace-shell';
import { V2DecisionMemoryDetail } from './v2-decision-memory-detail';
import { sanitizeAiPmResponse, sanitizeDocumentLabel, sanitizeAiPmParagraphs } from '@/lib/ai/ai-response-sanitizer';
import type { AppAuthUser } from '@/lib/auth/server-auth';
import { hasWorkspaceJourneyState } from '@/lib/project/workspace-journey-state';
import { stripWelcomeParamFromUrl } from '@/features/workspace/components/workspace-welcome-param-cleanup';
import { bootstrapWorkspaceFromDb } from '@/features/workspace/lib/bootstrap-workspace-from-db';
import { persistWorkspaceStateDbFirst } from '@/features/workspace/lib/sync-workspace-persistence';
import type { WorkspacePersistedSnapshot } from '@/lib/project/workspace-persisted-state';
import { V2DecisionSavePrompt } from './v2-decision-save-prompt';
import { V2DemoReadonlyBanner } from './v2-demo-readonly-banner';
import { V2DemoGuidedBanner } from './v2-demo-guided-banner';
import {
  buildAiPmPrimaryMessage,
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
import { loadUnderstandingPhase, clearBusinessUnderstandingConfirmed, saveUnderstandingPhase } from '../../lib/business-understanding/business-understanding-store';
import {
  clearAiPmLoopState,
  loadAiPmLoopState,
} from '../../lib/business-understanding/workspace-ai-pm-loop-store';
import { buildBusinessUnderstandingIntro, buildReviewTransitionMessage } from '../../lib/business-understanding/build-business-understanding';
import { isWorkspaceDocumentAnalyzable, looksLikeDocumentFileName } from '../../lib/business-understanding/workspace-document-eligibility';
import {
  deriveWorkspaceState,
} from '../../lib/business-understanding/workspace-state';
import {
  presentWorkspaceHeader,
  presentWorkspaceReviewGate,
  presentWorkspaceSidebar,
  presentSharedUnderstanding,
  presentUnderstandingSpine,
} from '../../lib/business-understanding/workspace-state-presenters';
import {
  clearAllDemoClientState,
  loadPersistedReviewCount,
  savePersistedReviewCount,
} from '../../lib/demo-guided-session';
import {
  DEMO_CUSTOM_DOCUMENT_KEY,
  DEMO_SESSION_PROJECT_ID,
  getDemoSample,
  type DemoSampleId,
} from '../../lib/demo-samples';

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
  demoSampleId?: DemoSampleId;
  demoFresh?: boolean;
  seedDocument?: string;
  isNewProject?: boolean;
  /** DB snapshot — authoritative workspace state on entry. */
  initialWorkspaceSnapshot?: WorkspacePersistedSnapshot | null;
};

export function V2StrategyWorkspaceView({
  mode = 'default',
  user = null,
  projectId,
  demoSampleId = 'launchlens',
  demoFresh = false,
  seedDocument,
  isNewProject = false,
  initialWorkspaceSnapshot = null,
}: V2StrategyWorkspaceViewProps) {
  const router = useRouter();
  const isDemoReadonly = mode === 'demo-readonly';
  const isDemoGuided = mode === 'demo-guided';
  const isDemoNoPersist = isDemoReadonly || isDemoGuided;
  const storageProjectId = isDemoGuided ? DEMO_SESSION_PROJECT_ID : projectId;
  const tb = useTranslations('workflow.v2.reviewBoard');
  const td = useTranslations('workflow.v2.strategyWorkspace.decisionMemory');
  const tDraft = useTranslations('workflow.v2.strategyWorkspace.decisionMemory.draft');
  const tDemo = useTranslations('workflow.journey.workspaceShell.demo');
  const tStrip = useTranslations('workflow.journey.workspaceShell.strip');

  const [phase, setPhase] = useState<WorkspacePhase>('compose');
  /** E3 — Review Start visible error + Retry (no silent fail) */
  const [reviewError, setReviewError] = useState<string | null>(null);

  /** Demo QA only — `?forceReviewError=1` surfaces real Retry UI for Evidence #15 (not Auth). */
  useEffect(() => {
    if (!isDemoGuided || typeof window === 'undefined') return;
    if (new URLSearchParams(window.location.search).get('forceReviewError') === '1') {
      setReviewError('시장성 분석을 시작하지 못했습니다. 다시 시도해 주세요.');
    }
  }, [isDemoGuided]);

  const [businessStateRevision, setBusinessStateRevision] = useState(0);
  const [activeStep, setActiveStep] = useState<WorkflowStepId>('idea');
  const [activeMemoryId, setActiveMemoryId] = useState<string | null>(null);
  const [memoryEntries, setMemoryEntries] = useState<DecisionMemoryEntry[]>([]);
  const [savedReviewRound, setSavedReviewRound] = useState(0);
  const [dismissedReviewRound, setDismissedReviewRound] = useState(0);

  const [idea, setIdea] = useState('');
  const [demoProjectName, setDemoProjectName] = useState('');
  const [optional, setOptional] = useState<Record<V2EvidenceField, string>>({
    problem: '',
    customer: '',
    mvp: '',
    pricing: '',
  });
  const [reviewCount, setReviewCount] = useState(() => {
    if (isDemoReadonly) return 1;
    if (initialWorkspaceSnapshot?.reviewCount != null) return initialWorkspaceSnapshot.reviewCount;
    return 0;
  });
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
  >(() => initialWorkspaceSnapshot?.understandingPhase ?? 'pending');

  useLayoutEffect(() => {
    if (isDemoNoPersist || !storageProjectId || !initialWorkspaceSnapshot) return;
    const boot = bootstrapWorkspaceFromDb(storageProjectId, initialWorkspaceSnapshot);
    setUnderstandingPhase(boot.understandingPhase);
    if (boot.reviewCount > 0) setReviewCount(boot.reviewCount);
  }, [initialWorkspaceSnapshot, isDemoNoPersist, storageProjectId]);

  useEffect(() => {
    if (isDemoReadonly || isDemoGuided || initialWorkspaceSnapshot) return;
    const persisted = loadPersistedReviewCount(storageProjectId);
    if (persisted > 0) setReviewCount(persisted);
  }, [storageProjectId, isDemoGuided, isDemoReadonly, initialWorkspaceSnapshot]);

  useEffect(() => {
    if (reviewCount === 0) {
      setMainView('ai-pm');
    }
  }, [storageProjectId, isDemoGuided, reviewCount]);

  useEffect(() => {
    if (reviewCount > 0) {
      setMainView('ai-pm');
    }
  }, [reviewCount]);

  const refreshUnderstandingState = useCallback(() => {
    setUnderstandingPhase(loadUnderstandingPhase(storageProjectId));
  }, [storageProjectId]);

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
    setMemoryEntries(loadDecisionMemory(storageProjectId));
  }, [storageProjectId]);

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
      const preservedCustomDocument =
        demoSampleId === 'custom'
          ? (typeof window !== 'undefined'
              ? sessionStorage.getItem(DEMO_CUSTOM_DOCUMENT_KEY)?.trim()
              : '')
          : '';

      if (demoFresh) {
        clearAllDemoClientState(DEMO_SESSION_PROJECT_ID);
        if (preservedCustomDocument) {
          sessionStorage.setItem(DEMO_CUSTOM_DOCUMENT_KEY, preservedCustomDocument);
        }
      }

      const customDocument =
        demoSampleId === 'custom'
          ? (preservedCustomDocument ||
              (typeof window !== 'undefined'
                ? sessionStorage.getItem(DEMO_CUSTOM_DOCUMENT_KEY)?.trim()
                : '') ||
              loadWorkspaceDocumentText(storageProjectId)?.trim() ||
              '')
          : '';

      const sample =
        demoSampleId === 'custom'
          ? {
              projectName: (() => {
                const first = customDocument.split('\n')[0]?.replace(/^[#\-\*]\s*/, '').trim() || '';
                // S15 P0-1 — filename / placeholder heading ≠ business name
                if (!first || looksLikeDocumentFileName(first) || looksLikeDocumentFileName(customDocument)) {
                  return '내 사업 Demo';
                }
                return first;
              })(),
              document: customDocument ?? '',
            }
          : getDemoSample(demoSampleId);

      if (sample.document.trim().length < 8) {
        if (demoSampleId === 'custom') {
          setDemoProjectName('내 사업 Demo');
          setReviewCount(0);
          setPhase('compose');
          setFollowUpDone(false);
          setLastReviewAt(null);
          refreshUnderstandingState();
          return;
        }
        window.location.assign('/demo/start');
        return;
      }

      saveWorkspaceDocumentText(sample.document, storageProjectId);
      const inferred = inferDomainFromPaste(sample.document, storageProjectId);
      setDomain(inferred.domain);
      setEntities(inferred.entities);
      setDemoProjectName(sample.projectName);
      setIdea(sample.projectName);
      setOptional({
        problem: '',
        customer: '',
        mvp: '',
        pricing: '',
      });
      setReviewCount(0);
      setPhase('compose');
      setFollowUpDone(false);
      setLastReviewAt(null);
      refreshUnderstandingState();
      return;
    }

    refreshMemory();
    refreshUnderstandingState();

    const resumeExistingJourney =
      !isDemoReadonly &&
      !isDemoGuided &&
      isNewProject &&
      typeof storageProjectId === 'string' &&
      hasWorkspaceJourneyState(storageProjectId);

    if (isNewProject && !resumeExistingJourney) {
      if (seedDocument && seedDocument.trim().length >= 8) {
        saveWorkspaceDocumentText(seedDocument, storageProjectId);
        const inferred = inferDomainFromPaste(seedDocument, storageProjectId);
        setDomain(inferred.domain);
        setEntities(inferred.entities);
        setIdea(inferred.domain.business.trim() || deriveProjectName(seedDocument));
      }
      return;
    }

    if (resumeExistingJourney) {
      stripWelcomeParamFromUrl(router);
    }

    const saved = loadV2Validation(storageProjectId);
    const storedDomain = loadWorkspaceDomain(storageProjectId);
    const storedEntities = loadWorkspaceEntities(storageProjectId);
    const existingDocument = loadWorkspaceDocumentText(storageProjectId);

    if (!existingDocument && seedDocument && seedDocument.trim().length >= 8) {
      saveWorkspaceDocumentText(seedDocument, storageProjectId);
      const inferred = inferDomainFromPaste(seedDocument, storageProjectId);
      setDomain(inferred.domain);
      setEntities(inferred.entities);
      setIdea(inferred.domain.business.trim() || deriveProjectName(seedDocument));
    } else if (!existingDocument && saved) {
      const combined = [
        saved.evidence.problem,
        saved.evidence.customer,
        saved.evidence.mvp,
        saved.evidence.pricing,
      ]
        .filter(Boolean)
        .join('\n');
      if (combined.trim().length >= 8) {
        saveWorkspaceDocumentText(combined, storageProjectId);
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
  }, [
    seedDocument,
    isNewProject,
    demoFresh,
    demoSampleId,
    isDemoReadonly,
    isDemoGuided,
    refreshMemory,
    storageProjectId,
    refreshUnderstandingState,
    router,
  ]);

  const handleDocumentIntake = useCallback(
    (content: string) => {
      if (isDemoReadonly) return;
      const trimmed = content.trim();
      if (!isWorkspaceDocumentAnalyzable(trimmed)) return;
      const inferred = inferDomainFromPaste(trimmed, storageProjectId);
      setDomain(inferred.domain);
      setEntities(inferred.entities);
      setIdea(inferred.domain.business.trim() || deriveProjectName(trimmed));
      if (isDemoGuided && typeof window !== 'undefined') {
        sessionStorage.setItem(DEMO_CUSTOM_DOCUMENT_KEY, trimmed);
      }
      clearAiPmLoopState(storageProjectId);
      saveUnderstandingPhase('pending', storageProjectId);
      setUnderstandingPhase('pending');
      refreshUnderstandingState();
      setBusinessStateRevision((value) => value + 1);
      if (!isDemoGuided && !isDemoReadonly && storageProjectId) {
        void persistWorkspaceStateDbFirst({ projectId: storageProjectId });
        stripWelcomeParamFromUrl(router);
      }
    },
    [isDemoGuided, isDemoReadonly, refreshUnderstandingState, router, storageProjectId],
  );

  const handleLoopDocumentUpdated = useCallback(() => {
    if (isDemoReadonly || !storageProjectId) return;
    const content = loadWorkspaceDocumentText(storageProjectId);
    if (!content?.trim()) return;
    const inferred = inferDomainFromPaste(content, storageProjectId);
    setDomain(inferred.domain);
    setEntities(inferred.entities);
    setIdea(inferred.domain.business.trim() || deriveProjectName(content));
    refreshUnderstandingState();
    setBusinessStateRevision((value) => value + 1);
    if (!isDemoGuided && !isDemoReadonly && storageProjectId) {
      void persistWorkspaceStateDbFirst({ projectId: storageProjectId });
    }
  }, [isDemoGuided, isDemoReadonly, refreshUnderstandingState, storageProjectId]);

  const handleLoopComplete = useCallback(() => {
    saveUnderstandingPhase('review-ready', storageProjectId);
    setUnderstandingPhase('review-ready');
    refreshUnderstandingState();
    setBusinessStateRevision((value) => value + 1);
    if (!isDemoGuided && !isDemoReadonly && storageProjectId) {
      void persistWorkspaceStateDbFirst({ projectId: storageProjectId });
    }
  }, [isDemoGuided, isDemoReadonly, refreshUnderstandingState, storageProjectId]);

  const handleSessionPause = useCallback(() => {
    if (isDemoGuided || isDemoReadonly || !storageProjectId) return;
    setBusinessStateRevision((value) => value + 1);
    void persistWorkspaceStateDbFirst({ projectId: storageProjectId });
  }, [isDemoGuided, isDemoReadonly, storageProjectId]);

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

  const persist = useCallback(
    (next: V2ValidationEvidence) => {
      if (isDemoNoPersist) return;
      saveV2Validation(next, storageProjectId);
    },
    [isDemoNoPersist, storageProjectId],
  );

  const handleAlignmentApplied = useCallback(
    (
      nextDomain: WorkspaceDomainEvidence,
      nextEntities: LaunchLensDomainContext,
      customer: string,
    ) => {
      if (isDemoReadonly) return;
      setDomain(nextDomain);
      setEntities(nextEntities);
      saveWorkspaceDomain(nextDomain, storageProjectId);
      saveWorkspaceEntities(nextEntities, storageProjectId);
      setOptional((prev) => ({ ...prev, customer }));
      persist({
        ...evidence,
        idea: nextDomain.business.trim(),
        customer: customer.trim() || undefined,
      });
    },
    [evidence, isDemoReadonly, persist, storageProjectId],
  );

  const handleDomainChange = (field: WorkspaceDomainFieldId, value: string) => {
    if (isDemoReadonly) return;
    setDomain((prev) => {
      const next = { ...prev, [field]: value };
      saveWorkspaceDomain(next, storageProjectId);
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
      saveWorkspaceEntities(next, storageProjectId);
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
      // S17 P1-2 — understanding update copy (not generic "saved")
      appToast.success(tb('toast.understandingUpdated'));
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

  const documentContext = useMemo(() => {
    const stored = loadWorkspaceDocumentText(storageProjectId);
    if (stored?.trim()) return stored;
    return [domain.business, domain.founder, domain.customer, domain.market]
      .filter(Boolean)
      .join('\n');
  }, [domain, storageProjectId, businessStateRevision]);

  const workspaceState = useMemo(
    () =>
      deriveWorkspaceState({
        projectId: storageProjectId,
        loop: loadAiPmLoopState(storageProjectId),
        understandingPhase,
        reviewCount,
        isDemoReadonly,
        domain,
        entities,
        documentText: documentContext,
      }),
    [
      businessStateRevision,
      documentContext,
      domain,
      entities,
      isDemoReadonly,
      reviewCount,
      storageProjectId,
      understandingPhase,
    ],
  );

  const sidebarSnapshot = presentWorkspaceSidebar(workspaceState);
  const workspaceBusinessState = presentWorkspaceHeader(workspaceState);
  const sharedUnderstanding = presentSharedUnderstanding(workspaceState);
  const understandingSpine = presentUnderstandingSpine(workspaceState);
  const reviewGate = presentWorkspaceReviewGate(workspaceState);

  const runReview = useCallback(() => {
    if (!reviewGate.canStart) return;
    setReviewError(null);

    try {
      // S14 — Evidence Status → AnalysisInput → Engine (Loop-unaware)
      const documentText = loadWorkspaceDocumentText(storageProjectId)?.trim() ?? '';
      const loop = loadAiPmLoopState(storageProjectId);
      const memory = buildConversationMemoryFromSources({
        projectId: storageProjectId ?? 'default',
        documentText,
        turns: loop.turns,
        entities,
        previous: loadConversationMemory(storageProjectId),
      });
      const evidenceStatus = deriveEvidenceStatusFromMemory({ memory, entities });
      const analysisInput = mapEvidenceStatusToAnalysisInput({ evidence: evidenceStatus });
      const analysisResult = runAnalysis(analysisInput);
      saveAnalysisResult(analysisResult, storageProjectId);

      persist(evidence);
      setPhase('reviewing');
      setReviewCount((c) => {
        const next = c + 1;
        savePersistedReviewCount(next, storageProjectId);
        if (!isDemoGuided && !isDemoReadonly && storageProjectId) {
          void persistWorkspaceStateDbFirst({ projectId: storageProjectId });
          stripWelcomeParamFromUrl(router);
        }
        return next;
      });
      setFollowUpDone(false);
      setActiveMemoryId(null);
      setLastReviewAt(new Date());

      window.setTimeout(() => {
        setPhase('board');
        setActiveStep('review');
        saveReviewSnapshot(evidence, storageProjectId);
        setInvestigationViewed(false);
        setDirtyHighlightField(null);
        setDirtyFieldLabel(null);
        createMeetingNoteFromReview(reviewCount + 1, storageProjectId);
        window.setTimeout(() => setPhase('followUp'), 400);
      }, REVIEW_MS);
    } catch (err) {
      const message =
        err instanceof Error && err.message.trim()
          ? err.message
          : '시장성 분석을 시작하지 못했습니다. 다시 시도해 주세요.';
      setReviewError(message);
      setPhase('compose');
    }
  }, [
    entities,
    evidence,
    isDemoGuided,
    isDemoReadonly,
    persist,
    reviewCount,
    reviewGate.canStart,
    router,
    storageProjectId,
  ]);

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
      ? demoProjectName || tDemo('sampleProjectName')
      : domain.business.trim() || deriveProjectName(idea) || deriveProjectName(evidence.idea);

  const showDemoLoginCta = isDemoGuided;

  const hasCompletedReview = isDemoGuided
    ? reviewCount >= 1
    : reviewCount >= 1 || loadPersistedReviewCount(storageProjectId) > 0;

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
    if (understandingPhase === 'edit' || understandingPhase === 'together' || understandingPhase === 'edit_confirm') {
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
          scoreDimensions={sidebarSnapshot.scoreDimensions}
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
          scoreDimensions={sidebarSnapshot.scoreDimensions}
          completedTopics={sidebarSnapshot.completedTopics}
          phase={phase}
          readOnly={isDemoReadonly}
          projectId={storageProjectId}
          showDemoLoginCta={showDemoLoginCta}
          hasCompletedReview={hasCompletedReview}
          onDocumentIntake={handleDocumentIntake}
          projectName={projectName}
          onLoopDocumentUpdated={handleLoopDocumentUpdated}
          onLoopComplete={handleLoopComplete}
          onSessionPause={handleSessionPause}
          workspaceFacts={initialWorkspaceSnapshot?.workspaceFacts ?? null}
          onAlignmentApplied={handleAlignmentApplied}
          onReview={runReview}
          reviewError={reviewError}
          reviewCanStart={reviewGate.canStart}
          reviewBlockedReason={reviewGate.blockedReason}
          onUnderstandingConfirmed={refreshUnderstandingState}
          onDomainChange={handleDomainChange}
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
      guestDemoMode={isDemoGuided}
      user={isDemoGuided ? null : user}
      sidebar={sidebarSnapshot}
      mainView={mainView}
      activeNodeId={activeNavNodeId}
      stripMessage={stripMessage}
      businessState={workspaceBusinessState}
      sharedUnderstanding={sharedUnderstanding}
      understandingSpine={understandingSpine}
      onMainViewChange={setMainView}
      onSelectNode={setActiveNavNodeId}
      onSelectAiPm={() => setMainView('ai-pm')}
    >
      {workspaceMain}
    </ProjectWorkspaceShell>
  );
}
