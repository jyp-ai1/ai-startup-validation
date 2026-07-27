'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { appToast } from '@repo/ui';

import {
  type V2EvidenceField,
  type V2ValidationEvidence,
  isEvidenceFieldFilled,
  loadV2Validation,
  saveV2Validation,
} from '../../lib/v2-validation-store';
import {
  type WorkflowStepId,
} from '../../lib/v2-workflow-steps';
import { JourneyLayout } from '../journey-layout';
import { V2AiSummaryPanel } from './v2-ai-summary-panel';
import { V2MainWorkspacePanel } from './v2-main-workspace-panel';
import { V2WorkflowNav } from './v2-workflow-nav';

type WorkspacePhase = 'compose' | 'reviewing' | 'board' | 'followUp';

const REVIEW_MS = 3200;

export function V2StrategyWorkspaceView() {
  const tb = useTranslations('workflow.v2.reviewBoard');

  const [phase, setPhase] = useState<WorkspacePhase>('compose');
  const [activeStep, setActiveStep] = useState<WorkflowStepId>('idea');
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

  useEffect(() => {
    const saved = loadV2Validation();
    if (!saved) return;
    setIdea(saved.evidence.idea);
    setOptional({
      problem: saved.evidence.problem ?? '',
      customer: saved.evidence.customer ?? '',
      mvp: saved.evidence.mvp ?? '',
      pricing: saved.evidence.pricing ?? '',
    });
  }, []);

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

  useEffect(() => {
    if (activeField || phase === 'reviewing') return;
    setActiveStep((current) => {
      if (current === 'idea' && !hasIdea) return 'idea';
      return current;
    });
  }, [activeField, hasIdea, phase]);

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
    setActiveStep(step);
  };

  return (
    <JourneyLayout phase="workflow" width="workspace" versionLabel="V2">
      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[minmax(0,240px)_minmax(0,1fr)_minmax(0,280px)] xl:gap-12">
        {/* Mobile: main first — nav rendered after main via order */}
        <div className="order-2 lg:order-1">
          <V2WorkflowNav
            activeStep={activeStep}
            evidence={evidence}
            reviewCount={reviewCount}
            onSelect={handleGoToStep}
          />
        </div>

        <div className="order-1 min-w-0 lg:order-2">
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

      {/* Tablet: summary below on lg without xl */}
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
