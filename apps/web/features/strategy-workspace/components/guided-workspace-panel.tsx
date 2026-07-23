'use client';

import type { StrategyWorkspaceViewModel } from '../services/strategy-workspace-types';
import { NextBestActionPanel } from './next-best-action-panel';
import { ProjectChecklist } from './project-checklist';
import { ProjectHealthPanel } from './project-health-panel';
import { StrategyProgressHero } from './strategy-progress-hero';
import { WorkspaceTimeline } from './workspace-timeline';

type GuidedWorkspacePanelProps = {
  strategy: StrategyWorkspaceViewModel;
  projectTitle: string;
};

export function GuidedWorkspacePanel({ strategy, projectTitle }: GuidedWorkspacePanelProps) {
  return (
    <div id="guided-workspace-panel" className="space-y-8">
      <StrategyProgressHero strategy={strategy} projectTitle={projectTitle} />

      <div className="grid gap-6 lg:grid-cols-[minmax(240px,280px)_1fr]">
        <ProjectChecklist items={strategy.checklist} />

        <div className="space-y-6">
          <NextBestActionPanel action={strategy.nextAction} projectId={strategy.projectId} />
          <WorkspaceTimeline timeline={strategy.timeline} projectId={strategy.projectId} />
          <ProjectHealthPanel health={strategy.health} moduleProgress={strategy.moduleProgress} />
        </div>
      </div>
    </div>
  );
}
