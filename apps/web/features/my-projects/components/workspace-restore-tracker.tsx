'use client';

import { useEffect, useRef } from 'react';

import type { StartupProject } from '@repo/types/validation';

import { deriveWorkspaceRestoreState } from '@/lib/release/workspace-restore';
import { PRODUCT_ANALYTICS_EVENTS, recordFunnelEvent } from '@/lib/analytics/product-analytics';

type WorkspaceRestoreTrackerProps = {
  project: StartupProject;
  isReturning?: boolean;
};

/** P0-7 / P0-8 — validate workspace restore after login and emit analytics. */
export function WorkspaceRestoreTracker({
  project,
  isReturning = false,
}: WorkspaceRestoreTrackerProps) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    const state = deriveWorkspaceRestoreState(project);

    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.workspaceRestoreValidated, {
      project_id: project.id,
      status: state.allPass ? 'pass' : 'fail',
      last_work: state.lastWorkLabel,
      last_stage: state.lastWorkStage,
      checks_passed: state.checks.filter((c) => c.pass).length,
      checks_total: state.checks.length,
      is_returning: isReturning,
    });

    if (isReturning) {
      void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.projectRecoveryValidated, {
        project_id: project.id,
        status: state.allPass ? 'pass' : 'fail',
        last_work: state.lastWorkLabel,
      });
    }
  }, [isReturning, project]);

  return null;
}
