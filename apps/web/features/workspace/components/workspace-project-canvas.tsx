'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

import { JourneyPageSkeleton } from '@/features/workflow-journey/components/journey-page-skeleton';
import { ProjectScopeTracker } from '@/features/my-projects/components/project-scope-tracker';
import { DemoProjectPromotedTracker } from '@/features/my-projects/components/demo-project-promoted-tracker';
import type { AppAuthUser } from '@/lib/auth/server-auth';
import { WorkspaceAuthCompleteTracker } from './workspace-auth-complete-tracker';
import { WorkspaceJourneyTracker } from './journey-page-tracker';
import { WorkspaceWelcomeParamCleanup } from './workspace-welcome-param-cleanup';
import { WorkspacePersistedHydrator } from './workspace-persisted-hydrator';
import { usePromotedWorkspaceSnapshot } from '../hooks/use-promoted-workspace-snapshot';
import type { WorkspacePersistedSnapshot } from '@/lib/project/workspace-persisted-state';

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
  seedDocument?: string;
  persistedWorkspace?: WorkspacePersistedSnapshot | null;
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
  seedDocument,
  persistedWorkspace = null,
}: WorkspaceProjectCanvasProps) {
  const effectiveSnapshot = usePromotedWorkspaceSnapshot(projectId, promoted, persistedWorkspace);
  const resolvedSeedDocument = seedDocument ?? effectiveSnapshot?.documentText;

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
      <WorkspaceWelcomeParamCleanup projectId={projectId} />
      <WorkspacePersistedHydrator projectId={projectId} snapshot={effectiveSnapshot} />
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
        key={
          demoMode === 'demo-guided'
            ? `demo-${demoSampleId}-${demoFresh ? 'fresh' : 'resume'}`
            : `${projectId}-${effectiveSnapshot?.updatedAt ?? 'empty'}-${welcome ? 'new' : 'open'}`
        }
        projectId={projectId}
        mode={demoMode === 'default' ? 'default' : demoMode}
        user={user}
        demoSampleId={demoSampleId}
        demoFresh={demoFresh}
        seedDocument={resolvedSeedDocument}
        isNewProject={welcome}
        initialWorkspaceSnapshot={effectiveSnapshot}
      />
    </>
  );
}
