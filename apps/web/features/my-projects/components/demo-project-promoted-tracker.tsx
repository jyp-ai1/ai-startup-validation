'use client';

import { useEffect } from 'react';

import { clearDemoProjectDraftCookie } from '@/features/workflow-journey/lib/v2-demo-project-store';

/** Clears demo draft cookie after successful login promotion. */
export function DemoProjectPromotedTracker() {
  useEffect(() => {
    clearDemoProjectDraftCookie();
  }, []);

  return null;
}
