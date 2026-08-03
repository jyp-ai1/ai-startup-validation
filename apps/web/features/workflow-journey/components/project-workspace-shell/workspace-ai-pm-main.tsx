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
} from '../../lib/business-understanding/workspace-ai-pm-loop-store';
import type { AiPmLoopIssueId } from '../../lib/business-understanding/workspace-ai-pm-loop-types';
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
  reviewCanStart?: boolean;
  reviewBlockedReason?: import('../../lib/business-understanding/workspace-state').WorkspaceReviewBlockedReason | null;
  onUnderstandingConfirmed?: () => void;
  showDemoLoginCta?: boolean;
  hasCompletedReview?: boolean;
  onDocumentIntake?: (content: string) => void;
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
  reviewCanStart = true,
  reviewBlockedReason = null,
  onUnderstandingConfirmed,
  showDemoLoginCta = false,
  hasCompletedReview = false,
  onDocumentIntake,
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
    if (loaded === 'accepted') {
      saveUnderstandingPhase('aligning', projectId);
      setUnderstandingPhase('aligning');
    } else {
      setUnderstandingPhase(loaded);
    }
    setSavedAlignment(loadMarketAlignment(projectId));
    setWorkshopAgreement(loadWorkshopAgreement(projectId));
    setLoopState(loadAiPmLoopState(projectId));
  }, [projectId, reviewCount]);

  const goToMarketAlignment = useCallback(() => {
    saveUnderstandingPhase('aligning', projectId);
    setUnderstandingPhase('aligning');
    onUnderstandingConfirmed?.();
  }, [projectId, onUnderstandingConfirmed]);

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

  const showAiPmLoop =
    documentAnalyzable &&
    Boolean(understanding) &&
    reviewCount === 0 &&
    phase === 'compose' &&
    !loopComplete;

  const showUnderstandingCard =
    Boolean(understanding) &&
    reviewCount === 0 &&
    loopComplete &&
    understandingPhase === 'pending';

  const showUnderstandingEdit =
    Boolean(understanding) &&
    reviewCount === 0 &&
    loopComplete &&
    (understandingPhase === 'edit' || understandingPhase === 'together');

  const showUnderstandingEditConfirm =
    Boolean(understanding) &&
    reviewCount === 0 &&
    loopComplete &&
    understandingPhase === 'edit_confirm';

  const showMarketAlignment =
    Boolean(understanding) &&
    reviewCount === 0 &&
    loopComplete &&
    (understandingPhase === 'aligning' || understandingPhase === 'accepted');

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
      goToMarketAlignment();
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
    goToMarketAlignment();
  }, [goToMarketAlignment]);

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

  if (phase === 'reviewing') {
    return (
      <div className={cn('mx-auto max-w-[720px] space-y-6 py-2', className)}>
        <WorkspaceAnalysisResultPanel
          presenter={
            analysisPresenter ?? {
              headline: '시장성 분석 결과',
              decisions: [],
              insights: [],
              recommended: null,
            }
          }
          analyzing
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
        <WorkspaceDocumentIntake onSubmit={onDocumentIntake} />
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
            workspaceFacts={workspaceFacts}
            onDocumentUpdated={() => handleLoopDocumentUpdated()}
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
          onConfirm={handleConfirmMode}
        />
      ) : null}

      {showUnderstandingEdit && onDomainChange ? (
        <WorkspaceUnderstandingEditFlow
          mode={understandingPhase === 'together' ? 'together' : 'edit'}
          domain={domain}
          entities={entities}
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
            <WorkspaceAnalysisResultPanel presenter={analysisPresenter} analyzing={false} />
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
              onFixPrimary={handleFixPrimaryIssue}
            />
          ) : null}

          <WorkspacePostReviewRoadmap
            workshopAgreement={workshopAgreement}
            workshopAgreed={workshopAgreed}
            showPrimaryAction
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
