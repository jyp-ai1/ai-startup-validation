'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';
import type { UnderstandingConfirmMode } from '@repo/types/domain/business-understanding';
import { sanitizeAiPmParagraphs } from '@/lib/ai/ai-response-sanitizer';
import { cn } from '@repo/ui/lib/utils';

import { buildBusinessUnderstanding } from '../../lib/business-understanding/build-business-understanding';
import { isWorkspaceDocumentAnalyzable, isWorkspaceDocumentReadable } from '../../lib/business-understanding/workspace-document-eligibility';
import {
  getResolvedIssueIds,
  isAiPmLoopComplete,
  loadAiPmLoopState,
  patchAiPmLoopState,
} from '../../lib/business-understanding/workspace-ai-pm-loop-store';
import {
  AI_PM_LOOP_ISSUE_ORDER,
  type AiPmLoopIssueId,
} from '../../lib/business-understanding/workspace-ai-pm-loop-types';
import { buildAiPmScoreNarrative } from '../../lib/build-ai-pm-score-narrative';
import { buildEditUnderstandingSummary } from '../../lib/business-understanding/build-edit-understanding-summary';
import {
  loadUnderstandingConfirmMode,
  loadUnderstandingPhase,
  saveUnderstandingConfirmMode,
  saveUnderstandingPhase,
  type UnderstandingPhase,
} from '../../lib/business-understanding/business-understanding-store';
import {
  loadWorkshopAgreement,
  shouldShowPostReviewWorkshop,
} from '../../lib/business-understanding/workspace-decision-workshop';
import {
  applyMarketAlignmentToWorkspace,
  buildMarketCandidates,
  loadMarketAlignment,
  resolvePrimaryCustomerLabel,
  saveMarketAlignment,
  type MarketAlignmentState,
  type MarketCandidate,
} from '../../lib/business-understanding/workspace-alignment';
import type { WorkspaceDomainEvidence, WorkspaceDomainFieldId } from '../../lib/workspace-ai-pm-messages';
import {
  buildAiPmPrimaryMessage,
  loadWorkspaceDocumentText,
} from '../../lib/workspace-ai-pm-messages';
import { WorkspaceAiPmLoopPanel } from './workspace-ai-pm-loop-panel';
import { WorkspaceAiPmScorePanel } from './workspace-ai-pm-score-panel';
import { WorkspaceBusinessAlignmentBlock } from './workspace-business-alignment-block';
import { WorkspaceBusinessUnderstandingCard } from './workspace-business-understanding-card';
import {
  WorkspaceUnderstandingConfirmFlow,
  WorkspaceUnderstandingEditFlow,
} from './workspace-understanding-edit-flow';
import { WorkspaceDecisionWorkshopBlock } from './workspace-decision-workshop-block';
import { WorkspaceDocumentIntake } from './workspace-document-intake';
import { WorkspaceDemoLoginCta } from './workspace-demo-login-cta';
import { WorkspaceNextStepPanel } from './workspace-next-step-panel';
import { WorkspaceAnalysisResultPanel } from './workspace-analysis-result-panel';
import { WorkspacePostReviewRoadmap } from './workspace-post-review-roadmap';
import { WorkspaceProgressiveOverview } from './workspace-progressive-overview';
import { loadAnalysisResult } from '../../lib/business-understanding/analysis-result-store';
import { presentAnalysisScreen } from '../../lib/business-understanding/present-analysis-screen';
import { buildEmptyProjectConversationSeed } from '../../lib/business-understanding/build-empty-project-seed';
import { buildSharedUnderstanding } from '../../lib/business-understanding/build-shared-understanding';
import { applyUserCorrection } from '../../lib/business-understanding/correction-and-why';
import {
  loadConversationMemory,
  saveConversationMemory,
} from '../../lib/business-understanding/conversation-memory-store';
import {
  factsToClearAfterEdit,
  invalidateDownstreamTurns,
} from '../../lib/business-understanding/living-understanding-state';
import { type ConversationFactKey } from '../../lib/business-understanding/conversation-memory';

import type { WorkspaceScoreDimensionSnapshot } from './workspace-shell-types';

type WorkspaceAiPmMainProps = {
  domain: WorkspaceDomainEvidence;
  entities?: LaunchLensDomainContext | null;
  reviewCount: number;
  businessScore: number | null;
  scoreDimensions?: WorkspaceScoreDimensionSnapshot[];
  completedTopics?: number;
  phase: 'compose' | 'reviewing' | 'board' | 'followUp';
  readOnly?: boolean;
  projectId?: string;
  onAlignmentApplied: (
    domain: WorkspaceDomainEvidence,
    entities: LaunchLensDomainContext,
    customer: string,
  ) => void;
  onReview: () => void;
  /** E3 — Review Start error message; Retry via onReview */
  reviewError?: string | null;
  reviewCanStart?: boolean;
  reviewBlockedReason?: import('../../lib/business-understanding/workspace-state').WorkspaceReviewBlockedReason | null;
  onUnderstandingConfirmed?: () => void;
  showDemoLoginCta?: boolean;
  hasCompletedReview?: boolean;
  onDocumentIntake?: (content: string) => void;
  /** Project display name — used for empty-start seed (S16 P0-5) */
  projectName?: string;
  onLoopDocumentUpdated?: () => void;
  onLoopComplete?: () => void;
  onSessionPause?: () => void;
  onDomainChange?: (field: WorkspaceDomainFieldId, value: string) => void;
  workspaceFacts?: import('@/lib/project/workspace-persisted-facts').WorkspacePersistedFacts | null;
  className?: string;
};

function buildDocumentContext(
  domain: WorkspaceDomainEvidence,
  entities: LaunchLensDomainContext | null | undefined,
  projectId?: string,
): string {
  const stored = loadWorkspaceDocumentText(projectId);
  if (stored?.trim()) return stored;
  return [
    domain.business,
    domain.founder,
    domain.customer,
    domain.market,
    entities?.business.model ?? '',
    entities?.customer.excerpt ?? '',
  ]
    .filter(Boolean)
    .join('\n');
}

function hasStoredWorkspaceDocument(projectId?: string): boolean {
  const stored = loadWorkspaceDocumentText(projectId);
  return isWorkspaceDocumentAnalyzable(stored);
}

export function WorkspaceAiPmMain({
  domain,
  entities = null,
  reviewCount,
  businessScore,
  scoreDimensions = [],
  completedTopics = 0,
  phase,
  readOnly = false,
  projectId,
  onAlignmentApplied,
  onReview,
  reviewError = null,
  reviewCanStart = true,
  reviewBlockedReason = null,
  onUnderstandingConfirmed,
  showDemoLoginCta = false,
  hasCompletedReview = false,
  onDocumentIntake,
  projectName,
  onLoopDocumentUpdated,
  onLoopComplete,
  onSessionPause,
  onDomainChange,
  workspaceFacts = null,
  className,
}: WorkspaceAiPmMainProps) {
  const t = useTranslations('workflow.journey.workspaceShell.aiPmMain');
  const tPostReview = useTranslations('workflow.journey.workspaceShell.postReview');
  const [understandingPhase, setUnderstandingPhase] = useState<UnderstandingPhase>('pending');
  const [savedAlignment, setSavedAlignment] = useState<MarketAlignmentState | null>(null);
  const [workshopAgreement, setWorkshopAgreement] = useState(() => loadWorkshopAgreement(projectId));
  const [loopState, setLoopState] = useState(() => loadAiPmLoopState(projectId));
  const analysisPresenter = useMemo(() => {
    const result = loadAnalysisResult(projectId);
    return result ? presentAnalysisScreen(result) : null;
  }, [projectId, reviewCount, phase]);

  useEffect(() => {
    const loaded = loadUnderstandingPhase(projectId);
    // S16 — 'accepted' means Shared Understanding confirmed; keep it (do not force aligning)
    setUnderstandingPhase(loaded);
    setSavedAlignment(loadMarketAlignment(projectId));
    setWorkshopAgreement(loadWorkshopAgreement(projectId));
    setLoopState(loadAiPmLoopState(projectId));
  }, [projectId, reviewCount]);

  const documentContext = useMemo(
    () => buildDocumentContext(domain, entities, projectId),
    [domain, entities, projectId],
  );

  const documentAnalyzable = isWorkspaceDocumentAnalyzable(documentContext);
  const storedDocumentText = loadWorkspaceDocumentText(projectId);
  const documentReadable = isWorkspaceDocumentReadable(storedDocumentText ?? documentContext);

  const understanding = useMemo(
    () => (documentAnalyzable ? buildBusinessUnderstanding(documentContext) : null),
    [documentAnalyzable, documentContext],
  );

  const loopComplete = isAiPmLoopComplete(loopState);

  const finalUnderstanding = useMemo(() => {
    if (!understanding) return null;
    return buildSharedUnderstanding({
      documentText: documentContext,
      turns: loopState.turns,
      understanding,
      entities,
      understandingPhase,
    });
  }, [documentContext, entities, loopState.turns, understanding, understandingPhase]);

  /** S16 P0-2 / P1-2 — confirm → next question (loop) or review-ready; never force market analysis */
  const proceedAfterUnderstandingConfirm = useCallback(() => {
    saveUnderstandingConfirmMode('accepted', projectId);
    if (isAiPmLoopComplete(loadAiPmLoopState(projectId))) {
      saveUnderstandingPhase('review-ready', projectId);
      setUnderstandingPhase('review-ready');
      onUnderstandingConfirmed?.();
      return;
    }
    saveUnderstandingPhase('accepted', projectId);
    setUnderstandingPhase('accepted');
    onUnderstandingConfirmed?.();
  }, [onUnderstandingConfirmed, projectId]);

  const scoreNarrative = useMemo(
    () =>
      understanding
        ? buildAiPmScoreNarrative(understanding, reviewCount, getResolvedIssueIds(loopState))
        : null,
    [understanding, loopState, reviewCount],
  );

  const marketCandidates = useMemo(
    () => (understanding ? buildMarketCandidates(understanding) : []),
    [understanding],
  );

  const understandingConfirmed =
    understandingPhase === 'accepted' ||
    understandingPhase === 'review-ready' ||
    understandingPhase === 'aligning' ||
    loopState.turns.length > 0;

  /** S16 P0-2 — after Trust/Reading, gate on Shared Understanding 「맞습니까?」 before first ask */
  const needsUnderstandingConfirm =
    Boolean(understanding) &&
    reviewCount === 0 &&
    !loopComplete &&
    loopState.readingCompleted &&
    loopState.turns.length === 0 &&
    understandingPhase === 'pending';

  const showAiPmLoop =
    documentAnalyzable &&
    Boolean(understanding) &&
    reviewCount === 0 &&
    phase === 'compose' &&
    !loopComplete &&
    !needsUnderstandingConfirm &&
    understandingPhase !== 'edit' &&
    understandingPhase !== 'together' &&
    understandingPhase !== 'edit_confirm';

  const showUnderstandingCard =
    Boolean(understanding) &&
    reviewCount === 0 &&
    (needsUnderstandingConfirm ||
      (loopComplete && understandingPhase === 'pending'));

  const showUnderstandingEdit =
    Boolean(understanding) &&
    reviewCount === 0 &&
    (understandingPhase === 'edit' || understandingPhase === 'together');

  const showUnderstandingEditConfirm =
    Boolean(understanding) &&
    reviewCount === 0 &&
    understandingPhase === 'edit_confirm';

  const showMarketAlignment =
    Boolean(understanding) &&
    reviewCount === 0 &&
    loopComplete &&
    understandingPhase === 'aligning';

  const showNextStepPanel =
    reviewCount === 0 &&
    phase === 'compose' &&
    loopComplete &&
    !showUnderstandingCard &&
    !showUnderstandingEdit &&
    !showUnderstandingEditConfirm &&
    !showMarketAlignment;

  const showPostReviewWorkshop =
    Boolean(understanding) && shouldShowPostReviewWorkshop(reviewCount, workshopAgreement);

  const workshopAgreed = Boolean(
    workshopAgreement?.agreed && workshopAgreement.reviewRound === reviewCount,
  );

  const isPostReview = reviewCount >= 1 || hasCompletedReview;

  const message = buildAiPmPrimaryMessage(domain, reviewCount, entities);
  const paragraphs = sanitizeAiPmParagraphs(message.paragraphs);

  const handleConfirmMode = (mode: UnderstandingConfirmMode) => {
    saveUnderstandingConfirmMode(mode, projectId);
    if (mode === 'accepted') {
      proceedAfterUnderstandingConfirm();
      return;
    }
    saveUnderstandingPhase(mode, projectId);
    setUnderstandingPhase(mode);
  };

  const editConfirmSummary = useMemo(() => {
    if (understandingPhase !== 'edit_confirm') return null;
    return buildEditUnderstandingSummary({
      documentText: documentContext,
      entities,
      loop: loopState,
    });
  }, [documentContext, entities, loopState, understandingPhase]);

  const handleApplyEdits = useCallback(() => {
    saveUnderstandingPhase('edit_confirm', projectId);
    setUnderstandingPhase('edit_confirm');
    onLoopDocumentUpdated?.();
    setLoopState(loadAiPmLoopState(projectId));
  }, [onLoopDocumentUpdated, projectId]);

  const handleEditConfirmYes = useCallback(() => {
    // W8 + v2 — correction locks USER_CORRECTED; invalidate downstream turns/facts
    const memory = loadConversationMemory(projectId);
    let nextMemory = memory;
    const pairs: Array<{ key: ConversationFactKey; value: string; issueId: AiPmLoopIssueId | null }> = [
      { key: 'business', value: domain.business, issueId: 'bm_design' },
      { key: 'customer', value: domain.customer, issueId: 'customer_definition' },
      { key: 'market', value: domain.market, issueId: 'market_validation' },
      { key: 'competitor', value: domain.competitor, issueId: 'competitor_analysis' },
    ];

    let earliestEditIssue: AiPmLoopIssueId | null = null;
    for (const pair of pairs) {
      if (!pair.value.trim()) continue;
      const prior = memory.facts.find((f) => f.key === pair.key)?.value ?? '';
      const applied = applyUserCorrection({
        projectId: projectId ?? 'default',
        fieldKey: pair.key,
        nextValue: pair.value,
        previous: nextMemory,
      });
      nextMemory = applied.memory;
      if (
        pair.issueId &&
        prior.trim() &&
        prior.trim() !== pair.value.trim() &&
        (!earliestEditIssue ||
          AI_PM_LOOP_ISSUE_ORDER.indexOf(pair.issueId) <
            AI_PM_LOOP_ISSUE_ORDER.indexOf(earliestEditIssue))
      ) {
        earliestEditIssue = pair.issueId;
      }
    }

    if (earliestEditIssue) {
      const loop = loadAiPmLoopState(projectId);
      const keptTurns = invalidateDownstreamTurns(
        loop.turns,
        earliestEditIssue,
        AI_PM_LOOP_ISSUE_ORDER,
      );
      // Drop facts that belonged to invalidated downstream issues
      for (const issueId of AI_PM_LOOP_ISSUE_ORDER) {
        if (AI_PM_LOOP_ISSUE_ORDER.indexOf(issueId) <= AI_PM_LOOP_ISSUE_ORDER.indexOf(earliestEditIssue)) {
          continue;
        }
        for (const key of factsToClearAfterEdit(issueId)) {
          nextMemory = {
            ...nextMemory,
            facts: nextMemory.facts.filter((f) => f.key !== key),
            updatedAt: new Date().toISOString(),
          };
        }
      }
      // Keep the edited issue turn if still present; otherwise clear to recompute
      const nextIssue =
        keptTurns.find((t) => t.issueId === earliestEditIssue)?.issueId ?? earliestEditIssue;
      patchAiPmLoopState(
        {
          turns: keptTurns,
          phase: 'issue',
          currentIssueId: nextIssue,
        },
        projectId,
      );
      setLoopState(loadAiPmLoopState(projectId));
    }

    saveConversationMemory(nextMemory, projectId);
    proceedAfterUnderstandingConfirm();
  }, [
    domain.business,
    domain.competitor,
    domain.customer,
    domain.market,
    proceedAfterUnderstandingConfirm,
    projectId,
  ]);

  const handleEditRevise = useCallback(() => {
    const mode = loadUnderstandingConfirmMode(projectId) ?? 'edit';
    saveUnderstandingPhase(mode, projectId);
    setUnderstandingPhase(mode);
  }, [projectId]);

  const handleAlignmentDirectionChange = useCallback(
    (state: MarketAlignmentState) => {
      saveMarketAlignment(state, projectId);
      setSavedAlignment(state);
    },
    [projectId],
  );

  const handleLoopDocumentUpdated = useCallback(() => {
    onLoopDocumentUpdated?.();
    setLoopState(loadAiPmLoopState(projectId));
  }, [onLoopDocumentUpdated, projectId]);

  const handleLoopComplete = useCallback(() => {
    saveUnderstandingPhase('review-ready', projectId);
    setUnderstandingPhase('review-ready');
    setLoopState(loadAiPmLoopState(projectId));
    onLoopComplete?.();
    onUnderstandingConfirmed?.();
  }, [onLoopComplete, onUnderstandingConfirmed, projectId]);

  const handleFixPrimaryIssue = useCallback((_issueId: AiPmLoopIssueId) => {
    window.requestAnimationFrame(() => {
      document.getElementById('post-review-workshop')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }, []);

  const handleMarketAligned = (state: MarketAlignmentState, candidates: MarketCandidate[]) => {
    const { domain: nextDomain, entities: nextEntities } = applyMarketAlignmentToWorkspace(
      state,
      candidates,
      domain,
      entities,
    );
    const customer = resolvePrimaryCustomerLabel(state);
    saveMarketAlignment(state, projectId);
    saveUnderstandingPhase('review-ready', projectId);
    setUnderstandingPhase('review-ready');
    setSavedAlignment(state);
    onAlignmentApplied(nextDomain, nextEntities, customer);
    onUnderstandingConfirmed?.();
    onReview();
  };

  if (phase === 'reviewing' || reviewError) {
    return (
      <div className={cn('mx-auto max-w-[720px] space-y-6 py-2', className)}>
        <WorkspaceAnalysisResultPanel
          presenter={
            analysisPresenter ?? {
              judgment: '판단 정리 중',
              evidence: [],
              reasons: [],
              criticalGap: null,
              hero: null,
              secondary: [],
              supportingScoreHint: null,
              headline: '시장성 분석 결과',
              decisions: [],
              insights: [],
              recommended: null,
            }
          }
          analyzing={phase === 'reviewing' && !reviewError}
          reviewError={reviewError}
          onRetryReview={reviewError ? onReview : undefined}
        />
      </div>
    );
  }

  const hasDocument = hasStoredWorkspaceDocument(projectId);
  const rawDocumentText = loadWorkspaceDocumentText(projectId);
  const hasWeakDocument = Boolean(rawDocumentText?.trim()) && !hasDocument;

  if (reviewCount === 0 && !hasDocument && onDocumentIntake) {
    return (
      <div className={cn('mx-auto max-w-[720px] space-y-4 py-2', className)}>
        {hasWeakDocument ? (
          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-5 py-4">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              {t('insufficientDocumentTitle')}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{t('insufficientDocumentHint')}</p>
          </section>
        ) : null}
        <WorkspaceDocumentIntake
          onSubmit={onDocumentIntake}
          onStartWithoutDocument={() => {
            onDocumentIntake(buildEmptyProjectConversationSeed(projectName));
          }}
        />
      </div>
    );
  }

  return (
    <div className={cn('mx-auto max-w-[720px] space-y-6 py-2', className)}>
      {showAiPmLoop && understanding ? (
        <div id="ai-pm-loop">
          <WorkspaceAiPmLoopPanel
            understanding={understanding}
            entities={entities}
            projectId={projectId}
            readOnly={readOnly}
            allowAsk={understandingConfirmed}
            workspaceFacts={workspaceFacts}
            onDocumentUpdated={() => handleLoopDocumentUpdated()}
            onLoopStateChange={() => setLoopState(loadAiPmLoopState(projectId))}
            onLoopComplete={handleLoopComplete}
            onSessionPause={onSessionPause}
          />
        </div>
      ) : null}

      {showUnderstandingCard && understanding ? (
        <WorkspaceBusinessUnderstandingCard
          understanding={understanding}
          entities={entities}
          documentReadable={documentReadable}
          documentText={storedDocumentText ?? documentContext}
          projectId={projectId}
          onConfirm={handleConfirmMode}
        />
      ) : null}

      {showUnderstandingEdit && onDomainChange ? (
        <WorkspaceUnderstandingEditFlow
          mode={understandingPhase === 'together' ? 'together' : 'edit'}
          domain={domain}
          entities={entities}
          projectId={projectId}
          readOnly={readOnly}
          onDomainChange={onDomainChange}
          onApplyEdits={handleApplyEdits}
        />
      ) : null}

      {showUnderstandingEditConfirm && editConfirmSummary ? (
        <WorkspaceUnderstandingConfirmFlow
          summary={editConfirmSummary}
          onConfirm={handleEditConfirmYes}
          onRevise={handleEditRevise}
        />
      ) : null}

      {showMarketAlignment && understanding ? (
        <WorkspaceBusinessAlignmentBlock
          understanding={understanding}
          initialState={savedAlignment}
          documentReadable={documentReadable}
          readOnly={readOnly}
          onDirectionChange={handleAlignmentDirectionChange}
          onConfirm={handleMarketAligned}
        />
      ) : null}

      {showNextStepPanel ? (
        <WorkspaceNextStepPanel
          phase={understandingPhase}
          hasDocument={hasDocument}
          canStartReview={reviewCanStart}
          reviewBlockedReason={reviewBlockedReason}
          alignment={savedAlignment}
          finalUnderstanding={finalUnderstanding}
          onContinueUnderstanding={() => {
            saveUnderstandingPhase('pending', projectId);
            setUnderstandingPhase('pending');
          }}
          onContinueAlignment={() => {
            saveUnderstandingPhase('aligning', projectId);
            setUnderstandingPhase('aligning');
          }}
          onStartReview={onReview}
        />
      ) : null}

      {!isPostReview &&
      !showAiPmLoop &&
      !showUnderstandingCard &&
      !showUnderstandingEdit &&
      !showUnderstandingEditConfirm &&
      !showMarketAlignment &&
      !showNextStepPanel &&
      understandingPhase !== 'aligning' ? (
        <section className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.05] to-background px-6 py-6 sm:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
            {t('label')}
          </p>
          <div className="mt-4 space-y-3 text-[15px] leading-relaxed">
            {paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>
      ) : null}

      {isPostReview ? (
        <div className="space-y-6">
          {analysisPresenter ? (
            <WorkspaceAnalysisResultPanel
              presenter={analysisPresenter}
              analyzing={false}
              onReturnToLoop={() => {
                document.getElementById('ai-pm-loop')?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                });
              }}
            />
          ) : null}
          {showPostReviewWorkshop && understanding && !analysisPresenter ? (
            <div id="post-review-workshop">
              <WorkspaceDecisionWorkshopBlock
                understanding={understanding}
                alignment={savedAlignment}
                candidates={marketCandidates}
                reviewCount={reviewCount}
                projectId={projectId}
                readOnly={readOnly}
                hero
                onAgreed={() => setWorkshopAgreement(loadWorkshopAgreement(projectId))}
              />
            </div>
          ) : !analysisPresenter ? (
            <section className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.04] to-background px-5 py-5 sm:px-7">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                {tPostReview('completeLabel')}
              </p>
              <p className="mt-3 text-[15px] font-medium leading-relaxed">{tPostReview('completeLead')}</p>
              <p className="mt-2 text-sm text-muted-foreground">{tPostReview('completeSub')}</p>
            </section>
          ) : null}

          {scoreNarrative ? (
            <WorkspaceAiPmScorePanel
              narrative={scoreNarrative}
              readOnly={readOnly}
              emphasis="supporting"
              onFixPrimary={analysisPresenter ? undefined : handleFixPrimaryIssue}
            />
          ) : null}

          <WorkspacePostReviewRoadmap
            workshopAgreement={workshopAgreement}
            workshopAgreed={workshopAgreed}
            showPrimaryAction={!analysisPresenter}
            primaryActionLabel={tPostReview('primaryAction')}
          />

          {showDemoLoginCta ? <WorkspaceDemoLoginCta /> : null}

          {reviewCount > 0 || completedTopics >= 2 ? (
            <WorkspaceProgressiveOverview
              businessScore={businessScore}
              scoreDimensions={scoreDimensions}
              reviewCount={reviewCount}
              completedTopics={completedTopics}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
