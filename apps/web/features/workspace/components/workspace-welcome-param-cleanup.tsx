'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { hasWorkspaceJourneyState } from '@/lib/project/workspace-journey-state';

type WorkspaceWelcomeParamCleanupProps = {
  projectId: string;
};

/** Strip ?welcome=1 once journey progress exists — prevents F5 welcome reset. */
function WorkspaceWelcomeParamCleanupInner({ projectId }: WorkspaceWelcomeParamCleanupProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const cleaned = useRef(false);

  useEffect(() => {
    if (searchParams.get('welcome') !== '1' || cleaned.current) return;
    if (!hasWorkspaceJourneyState(projectId)) return;

    cleaned.current = true;
    const url = new URL(window.location.href);
    url.searchParams.delete('welcome');
    router.replace(url.pathname + url.search, { scroll: false });
  }, [projectId, router, searchParams]);

  return null;
}

export function WorkspaceWelcomeParamCleanup({ projectId }: WorkspaceWelcomeParamCleanupProps) {
  return (
    <Suspense fallback={null}>
      <WorkspaceWelcomeParamCleanupInner projectId={projectId} />
    </Suspense>
  );
}

/** Call after AI Read / Review starts so refresh never re-enters welcome mode. */
export function stripWelcomeParamFromUrl(router: { replace: (href: string, options?: { scroll?: boolean }) => void }): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has('welcome')) return;
  url.searchParams.delete('welcome');
  router.replace(url.pathname + url.search, { scroll: false });
}
