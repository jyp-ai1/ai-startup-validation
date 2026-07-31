'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';
import type { UnderstandingConfirmMode } from '@repo/types/domain/business-understanding';
import { sanitizeAiPmParagraphs } from '@/lib/ai/ai-response-sanitizer';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { buildBusinessUnderstanding } from '../../lib/business-understanding/build-business-understanding';
import {
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
import {
  buildAiPmPrimaryMessage,
  loadWorkspaceDocumentText,
  type WorkspaceDomainEvidence,
} from '../../lib/workspace-ai-pm-messages';
import { WorkspaceBusinessAlignmentBlock } from './workspace-business-alignment-block';
import { WorkspaceBusinessUnderstandingCard } from './workspace-business-understanding-card';
import { WorkspaceDecisionWorkshopBlock } from './workspace-decision-workshop-block';
import { WorkspaceDocumentIntake } from './workspace-document-intake';
import { WorkspaceDemoLoginCta } from './workspace-demo-login-cta';
import { WorkspaceNextStepPanel } from './workspace-next-step-panel';
import { WorkspacePostReviewRoadmap } from './workspace-post-review-roadmap';
import { WorkspaceProgressiveOverview } from './workspace-progressive-overview';

type WorkspaceAiPmMainProps = {
  domain: WorkspaceDomainEvidence;
  entities?: LaunchLensDomainContext | null;
  reviewCount: number;
  businessScore: number | null;
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
  onUnderstandingConfirmed?: () => void;
  showDemoLoginCta?: boolean;
  hasCompletedReview?: boolean;
  onDocumentIntake?: (content: string) => void;
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

export function WorkspaceAiPmMain({
  domain,
  entities = null,
  reviewCount,
  businessScore,
  completedTopics = 0,
  phase,
  readOnly = false,
  projectId,
  onAlignmentApplied,
  onReview,
  onUnderstandingConfirmed,
  showDemoLoginCta = false,
  hasCompletedReview = false,
  onDocumentIntake,
  className,
}: WorkspaceAiPmMainProps) {
  const t = useTranslations('workflow.journey.workspaceShell.aiPmMain');
  const tPostReview = useTranslations('workflow.journey.workspaceShell.postReview');
  const [understandingPhase, setUnderstandingPhase] = useState<UnderstandingPhase>('pending');
  const [savedAlignment, setSavedAlignment] = useState<MarketAlignmentState | null>(null);
  const [workshopAgreement, setWorkshopAgreement] = useState(() => loadWorkshopAgreement(projectId));

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

  const understanding = useMemo(
    () => (documentContext.trim().length >= 8 ? buildBusinessUnderstanding(documentContext) : null),
    [documentContext],
  );

  const marketCandidates = useMemo(
    () => (understanding ? buildMarketCandidates(understanding) : []),
    [understanding],
  );

  const showUnderstandingCard =
    Boolean(understanding) &&
    reviewCount === 0 &&
    (understandingPhase === 'pending' ||
      understandingPhase === 'edit' ||
      understandingPhase === 'together');

  const showMarketAlignment =
    Boolean(understanding) &&
    reviewCount === 0 &&
    (understandingPhase === 'aligning' || understandingPhase === 'accepted');

  const showNextStepPanel =
    reviewCount === 0 &&
    phase === 'compose' &&
    !showUnderstandingCard &&
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
    goToMarketAlignment();
  };

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
      <section
        className={cn(
          'flex min-h-[420px] flex-col items-center justify-center py-16 text-center lg:min-h-[480px]',
          className,
        )}
      >
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
        <p className="mt-4 text-sm font-medium">{t('reviewingTitle')}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t('reviewingHint')}</p>
      </section>
    );
  }

  const hasDocument = documentContext.trim().length >= 8;

  if (reviewCount === 0 && !hasDocument && onDocumentIntake) {
    return (
      <div className={cn('mx-auto max-w-[720px] py-2', className)}>
        <WorkspaceDocumentIntake onSubmit={onDocumentIntake} />
      </div>
    );
  }

  return (
    <div className={cn('mx-auto max-w-[720px] space-y-6 py-2', className)}>
      {showUnderstandingCard && understanding ? (
        <WorkspaceBusinessUnderstandingCard
          understanding={understanding}
          entities={entities}
          onConfirm={handleConfirmMode}
        />
      ) : null}

      {showMarketAlignment && understanding ? (
        <WorkspaceBusinessAlignmentBlock
          understanding={understanding}
          initialState={savedAlignment}
          readOnly={readOnly}
          onConfirm={handleMarketAligned}
        />
      ) : null}

      {showNextStepPanel ? (
        <WorkspaceNextStepPanel
          phase={understandingPhase}
          hasDocument={hasDocument}
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
      !showUnderstandingCard &&
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
          <section className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.04] to-background px-5 py-5 sm:px-7">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
              {tPostReview('completeLabel')}
            </p>
            <p className="mt-3 text-[15px] font-medium leading-relaxed">{tPostReview('completeLead')}</p>
            <p className="mt-2 text-sm text-muted-foreground">{tPostReview('completeSub')}</p>
          </section>

          {showPostReviewWorkshop && understanding ? (
            <div id="post-review-workshop">
              <WorkspaceDecisionWorkshopBlock
                understanding={understanding}
                alignment={savedAlignment}
                candidates={marketCandidates}
                reviewCount={reviewCount}
                projectId={projectId}
                readOnly={readOnly}
                onAgreed={() => setWorkshopAgreement(loadWorkshopAgreement(projectId))}
              />
            </div>
          ) : (
            <section className="rounded-2xl border border-primary/25 bg-primary/[0.03] px-5 py-5 sm:px-7">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                {tPostReview('insightLabel')}
              </p>
              <p className="mt-3 text-[15px] leading-relaxed">{tPostReview('fallbackInsight')}</p>
              <Button type="button" className="mt-4 rounded-xl" disabled={readOnly}>
                {tPostReview('primaryAction')}
              </Button>
            </section>
          )}

          <WorkspacePostReviewRoadmap
            workshopAgreement={workshopAgreement}
            workshopAgreed={workshopAgreed}
            showPrimaryAction={
              !workshopAgreed && !(showPostReviewWorkshop && Boolean(understanding))
            }
            primaryActionLabel={tPostReview('primaryAction')}
          />

          {showDemoLoginCta ? <WorkspaceDemoLoginCta /> : null}

          {reviewCount > 0 || completedTopics >= 2 ? (
            <WorkspaceProgressiveOverview
              businessScore={businessScore}
              reviewCount={reviewCount}
              completedTopics={completedTopics}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
