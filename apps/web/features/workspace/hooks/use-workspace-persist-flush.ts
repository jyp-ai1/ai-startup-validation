'use client';

import { useEffect } from 'react';

import { persistWorkspaceStateDbFirst } from '@/features/workspace/lib/sync-workspace-persistence';

/** LS-1 — flush DB snapshot on tab hide / unload (authenticated workspace). */
export function useWorkspacePersistFlush(
  projectId: string | undefined,
  enabled: boolean,
): void {
  useEffect(() => {
    if (!enabled || !projectId || typeof window === 'undefined') return;

    const flush = () => {
      void persistWorkspaceStateDbFirst({ projectId });
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [projectId, enabled]);
}
