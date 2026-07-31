'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

import { JourneyPageSkeleton } from '@/features/workflow-journey/components/journey-page-skeleton';
import { ProjectScopeTracker } from '@/features/my-projects/components/project-scope-tracker';
import { DemoProjectPromotedTracker } from '@/features/my-projects/components/demo-project-promoted-tracker';
import type { AppAuthUser } from '@/lib/auth/server-auth';
import { WorkspaceAuthCompleteTracker } from './workspace-auth-complete-tracker';
import { WorkspaceJourneyTracker } from './journey-page-tracker';

const V2StrategyWorkspaceView = dynamic(
  () =>
    import('@/features/workflow-journey/components/v2/v2-strategy-workspace').then(
      (m) => m.V2StrategyWorkspaceView,
    ),
  { loading: () => <JourneyPageSkeleton phase="workflow" /> },
);

const PersonaSelectionView = dynamic(
  () =>
    import('@/features/workflow-journey/components/v2/persona-selection-view').then(
      (m) => m.PersonaSelectionView,
    ),
  { loading: () => <JourneyPageSkeleton phase="goal" /> },
);

type WorkspaceProjectCanvasProps = {
  projectId: string;
  user: AppAuthUser;
  welcome?: boolean;
  promoted?: boolean;
  authComplete?: boolean;
  needsPersona?: boolean;
  demoMode?: 'default' | 'demo-readonly' | 'demo-guided';
  demoSampleId?: import('@/features/workflow-journey/lib/demo-samples').DemoSampleId;
  demoFresh?: boolean;
};

/** Single project workspace — AI PM canvas on /workspace?project= */
export function WorkspaceProjectCanvas({
  projectId,
  user,
  welcome = false,
  promoted = false,
  authComplete = false,
  needsPersona = false,
  demoMode = 'default',
  demoSampleId = 'launchlens',
  demoFresh = false,
}: WorkspaceProjectCanvasProps) {
  if (needsPersona) {
    return (
      <>
        <Suspense fallback={null}>
          <ProjectScopeTracker projectId={projectId} isNewProject={welcome} />
        </Suspense>
        {authComplete ? (
          <Suspense fallback={null}>
            <WorkspaceAuthCompleteTracker
              screen="/workspace"
              projectId={projectId}
              promoted={promoted}
            />
          </Suspense>
        ) : null}
        <PersonaSelectionView user={user} projectId={projectId} />
      </>
    );
  }

  return (
    <>
      <Suspense fallback={null}>
        <ProjectScopeTracker projectId={projectId} isNewProject={welcome} />
      </Suspense>
      <WorkspaceJourneyTracker projectId={projectId} />
      {authComplete ? (
        <Suspense fallback={null}>
          <WorkspaceAuthCompleteTracker
            screen="/workspace"
            projectId={projectId}
            promoted={promoted}
          />
        </Suspense>
      ) : null}
      {promoted ? (
        <Suspense fallback={null}>
          <DemoProjectPromotedTracker projectId={projectId} />
        </Suspense>
      ) : null}
      <V2StrategyWorkspaceView
        key={demoMode === 'demo-guided' ? `demo-${demoSampleId}-${demoFresh ? 'fresh' : 'resume'}` : projectId}
        projectId={projectId}
        mode={demoMode === 'default' ? 'default' : demoMode}
        user={user}
        demoSampleId={demoSampleId}
        demoFresh={demoFresh}
      />
    </>
  );
}
