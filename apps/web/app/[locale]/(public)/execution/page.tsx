import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

import { JourneyPageSkeleton } from '@/features/workflow-journey/components/journey-page-skeleton';
import { buildPageMetadata } from '@/lib/site/page-metadata';

const ExecutionWorkspaceView = dynamic(
  () =>
    import('@/features/workflow-journey/components/execution-workspace-view').then(
      (m) => m.ExecutionWorkspaceView,
    ),
  { loading: () => <JourneyPageSkeleton phase="workspace" /> },
);

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    titleKey: 'title',
    descriptionKey: 'subtitle',
    namespace: 'workflow.execution',
    path: '/execution',
  });
}

export default function ExecutionPage() {
  return <ExecutionWorkspaceView />;
}
