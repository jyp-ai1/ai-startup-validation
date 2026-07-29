'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';

import { LocaleSwitcher } from '@/components/locale-switcher';
import type { AppAuthUser } from '@/lib/auth/server-auth';
import { cn } from '@repo/ui/lib/utils';

import { JourneyGlobalNav } from '../journey-global-nav';
import { WorkspaceAiPmStrip } from './workspace-ai-pm-strip';
import { WorkspaceSidebar } from './workspace-sidebar';
import type {
  WorkspaceMainView,
  WorkspaceNavNodeId,
  WorkspaceSidebarSnapshot,
} from './workspace-shell-types';

type ProjectWorkspaceShellProps = {
  projectName: string;
  user?: AppAuthUser | null;
  sidebar: WorkspaceSidebarSnapshot;
  mainView: WorkspaceMainView;
  activeNodeId: WorkspaceNavNodeId | null;
  onMainViewChange: (view: WorkspaceMainView) => void;
  onSelectNode: (nodeId: WorkspaceNavNodeId) => void;
  onSelectAiPm: () => void;
  stripMessage?: string | null;
  children: React.ReactNode;
  className?: string;
};

export function ProjectWorkspaceShell({
  projectName,
  user = null,
  sidebar,
  mainView,
  activeNodeId,
  onMainViewChange,
  onSelectNode,
  onSelectAiPm,
  stripMessage = null,
  children,
  className,
}: ProjectWorkspaceShellProps) {
  return (
    <div className={cn('flex min-h-screen flex-col bg-background', className)}>
      <header className="shrink-0 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="flex h-[52px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 text-sm font-semibold tracking-tight"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="size-4" aria-hidden />
              </span>
              LaunchLens
            </Link>
            {projectName ? (
              <p className="truncate text-sm text-muted-foreground">{projectName}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <JourneyGlobalNav user={user} />
            <LocaleSwitcher />
          </div>
        </div>
      </header>

      <WorkspaceAiPmStrip message={stripMessage} />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <WorkspaceSidebar
          snapshot={sidebar}
          mainView={mainView}
          activeNodeId={activeNodeId}
          onSelectNode={(nodeId) => {
            onSelectNode(nodeId);
            onMainViewChange('overview');
          }}
          onSelectOverview={() => onMainViewChange('overview')}
          onSelectAiPm={onSelectAiPm}
        />

        <main
          id="main-content"
          className="min-h-0 flex-1 overflow-y-auto px-6 py-8 sm:px-10 sm:py-10 lg:px-[clamp(2.5rem,6vw,5rem)]"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
