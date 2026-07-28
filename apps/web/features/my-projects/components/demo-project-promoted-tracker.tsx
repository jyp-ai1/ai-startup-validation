'use client';

import { useEffect } from 'react';

import { mergeDemoWorkflowSnapshotAction } from '@/features/my-projects/actions/my-project-actions';
import { PRODUCT_ANALYTICS_EVENTS, recordFunnelEvent } from '@/lib/analytics/product-analytics';
import {
  clearDemoProjectDraftCookie,
  clearDemoWorkflowSnapshot,
  loadDemoWorkflowSnapshot,
} from '@/features/workflow-journey/lib/v2-demo-project-store';

type DemoProjectPromotedTrackerProps = {
  projectId: string;
};

/** Clears demo draft cookie and merges sessionStorage workflow into project (Sprint 5 A-2 / P0-9). */
export function DemoProjectPromotedTracker({ projectId }: DemoProjectPromotedTrackerProps) {
  useEffect(() => {
    const snapshot = loadDemoWorkflowSnapshot();

    void (async () => {
      if (snapshot) {
        const result = await mergeDemoWorkflowSnapshotAction(projectId, snapshot);
        void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.demoRecoveryValidated, {
          project_id: projectId,
          status: result.ok ? 'pass' : 'fail',
        });
      } else {
        void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.demoRecoveryValidated, {
          project_id: projectId,
          status: 'pass',
        });
      }
    })();

    clearDemoProjectDraftCookie();
    clearDemoWorkflowSnapshot();
  }, [projectId]);

  return null;
}
