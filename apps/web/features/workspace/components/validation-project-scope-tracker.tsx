'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

import { ProjectScopeTracker } from '@/features/my-projects/components/project-scope-tracker';
import { PRODUCT_ANALYTICS_EVENTS, recordFunnelEvent } from '@/lib/analytics/product-analytics';
import { getBrowserFamily } from '@/lib/analytics/browser-context';

/** Sets active project + clears bleed when ?project= is present on /validation. */
export function ValidationProjectScopeTracker() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');
  const welcome = searchParams.get('welcome') === '1';
  const tracked = useRef(false);

  useEffect(() => {
    if (!projectId || tracked.current) return;
    tracked.current = true;
    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.validationOpen, {
      screen: '/validation',
      browser: getBrowserFamily(),
      project_id: projectId,
    });
  }, [projectId, welcome]);

  if (!projectId) return null;

  return <ProjectScopeTracker projectId={projectId} isNewProject={welcome} />;
}
