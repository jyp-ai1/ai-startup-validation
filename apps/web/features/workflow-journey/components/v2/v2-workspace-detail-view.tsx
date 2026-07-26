'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { toast } from '@repo/ui';

import { useJourneyProject } from '../../hooks/use-journey-project';
import { useV2WorkspaceDetailData } from '../../hooks/use-v2-workspace-detail-data';
import { resolveAiPmStatus, resolveProjectPhaseKey } from '../../lib/v2-project-phase';
import { V2_PERSONA_COOKIE } from '../../types/v2-persona';
import { isV2PersonaId, type V2PersonaId } from '../../types/v2-persona';
import type { WorkflowGoalId } from '../../types';
import { V2AiPmSection } from './v2-ai-pm-section';
import { V2DecisionPanelSimple } from './v2-decision-panel-simple';
import { V2DetailEvidence } from './v2-detail-evidence';
import { V2WorkspaceDetailHeader } from './v2-workspace-detail-header';

type V2WorkspaceDetailViewProps = {
  goalId: WorkflowGoalId;
};

function readPersonaFromCookie(): V2PersonaId | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`${V2_PERSONA_COOKIE}=([^;]+)`));
  const value = match?.[1];
  return value && isV2PersonaId(value) ? value : null;
}

/** Sprint 0-3 — AI PM Workspace Detail (single column, no legacy panels). */
export function V2WorkspaceDetailView({ goalId }: V2WorkspaceDetailViewProps) {
  const t = useTranslations('workflow.v2.detail');
  const { projectId, project, ready } = useJourneyProject();
  const { habitBrief, decisionData, homeCard, todayAction } = useV2WorkspaceDetailData(
    project,
    projectId,
    goalId,
  );
  const [approved, setApproved] = useState(false);
  const [personaId, setPersonaId] = useState<V2PersonaId | null>(null);

  useEffect(() => {
    setPersonaId(readPersonaFromCookie());
  }, []);

  const phaseKey = resolveProjectPhaseKey(goalId, personaId);
  const status = resolveAiPmStatus({
    approved,
    hasPendingApproval: Boolean(todayAction) && !approved,
  });

  const handleApprove = useCallback(() => {
    if (!todayAction) return;
    setApproved(true);
    toast.success(t('aiPm.approveToast', { action: todayAction.title }));
  }, [t, todayAction]);

  if (!ready) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <V2WorkspaceDetailHeader project={project} phaseKey={phaseKey} homeCard={homeCard} />
      <main className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:px-6">
        <V2AiPmSection
          status={status}
          habit={habitBrief}
          todayAction={todayAction}
          approved={approved}
          onApprove={handleApprove}
        />
        <V2DecisionPanelSimple data={decisionData} />
        <V2DetailEvidence data={decisionData} />
      </main>
    </div>
  );
}
