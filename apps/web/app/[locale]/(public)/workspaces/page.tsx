import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

import { JourneyPageSkeleton } from '@/features/workflow-journey/components/journey-page-skeleton';
import { buildPageMetadata } from '@/lib/site/page-metadata';

const V2WorkspaceHomeView = dynamic(
  () =>
    import('@/features/workflow-journey/components/v2/v2-workspace-home-view').then(
      (m) => m.V2WorkspaceHomeView,
    ),
  { loading: () => <JourneyPageSkeleton phase="workspace" /> },
);

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    titleKey: 'title',
    namespace: 'workflow.v2.home',
    path: '/workspaces',
  });
}

/** LaunchLens Home — workspace list (Sprint 0-2). */
export default function WorkspacesPage() {
  return <V2WorkspaceHomeView />;
}
