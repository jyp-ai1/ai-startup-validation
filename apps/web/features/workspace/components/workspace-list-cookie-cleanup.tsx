'use client';

import { useEffect } from 'react';

import { clearLegacyGlobalKeys } from '@/lib/project/project-context-store';

const WORKSPACE_MODE_COOKIE = 'WORKSPACE_MODE';

type WorkspaceListCookieCleanupProps = {
  /** Clear demo workspace cookie when authenticated user lands on project list. */
  clearStaleDemoMode?: boolean;
};

function expireCookie(name: string): void {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

/** Client-side cookie cleanup — Server Components must not call cookies().delete(). */
export function WorkspaceListCookieCleanup({
  clearStaleDemoMode = false,
}: WorkspaceListCookieCleanupProps) {
  useEffect(() => {
    expireCookie('ACTIVE_PROJECT_ID');
    if (clearStaleDemoMode) {
      expireCookie(WORKSPACE_MODE_COOKIE);
    }
    clearLegacyGlobalKeys();
  }, [clearStaleDemoMode]);

  return null;
}
