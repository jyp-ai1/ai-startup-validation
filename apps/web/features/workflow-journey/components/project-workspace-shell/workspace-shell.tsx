'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { LocaleSwitcher } from '@/components/locale-switcher';
import { AlabomLogo } from '@/lib/brand/alabom-logo';
import { BRAND_CONFIG } from '@/lib/brand/brand-config';
import type { AppAuthUser } from '@/lib/auth/server-auth';
import { cn } from '@repo/ui/lib/utils';

import { JourneyGlobalNav } from '../journey-global-nav';
import { WorkspaceAiPmStrip } from './workspace-ai-pm-strip';
import { WorkspaceBusinessStateHeader } from './workspace-business-state-header';
import { WorkspaceSharedUnderstandingPanel } from './workspace-shared-understanding-panel';
import { WorkspaceSidebar } from './workspace-sidebar';
import type { WorkspaceBusinessState } from '../../lib/business-understanding/build-ai-pm-business-clarity';
import type { WorkspaceSharedUnderstanding } from '../../lib/business-understanding/build-shared-understanding';
import type { WorkspaceUnderstandingSpine } from '../../lib/business-understanding/build-shared-understanding';
import type {
  WorkspaceMainView,
  WorkspaceNavNodeId,
  WorkspaceSidebarSnapshot,
} from './workspace-shell-types';

type ProjectWorkspaceShellProps = {
  projectName: string;
  demoBadge?: boolean;
  guestDemoMode?: boolean;
  user?: AppAuthUser | null;
  sidebar: WorkspaceSidebarSnapshot;
  mainView: WorkspaceMainView;
  activeNodeId: WorkspaceNavNodeId | null;
  onMainViewChange: (view: WorkspaceMainView) => void;
  onSelectNode: (nodeId: WorkspaceNavNodeId) => void;
  onSelectAiPm: () => void;
  stripMessage?: string | null;
  businessState?: WorkspaceBusinessState | null;
  sharedUnderstanding?: WorkspaceSharedUnderstanding | null;
  understandingSpine?: WorkspaceUnderstandingSpine | null;
  children: React.ReactNode;
  className?: string;
};

export function ProjectWorkspaceShell({
  projectName,
  demoBadge = false,
  guestDemoMode = false,
  user = null,
  sidebar,
  mainView,
  activeNodeId,
  onMainViewChange,
  onSelectNode,
  onSelectAiPm,
  stripMessage = null,
  businessState = null,
  sharedUnderstanding = null,
  understandingSpine = null,
  children,
  className,
}: ProjectWorkspaceShellProps) {
  useEffect(() => {
    if (!guestDemoMode) return;
    document.title = `Demo Workspace | ${BRAND_CONFIG.displayName}`;
  }, [guestDemoMode]);

  return (
    <div className={cn('flex min-h-screen flex-col bg-background', className)}>
      <header className="shrink-0 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="flex h-[52px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/"
              className="flex shrink-0 items-center"
              aria-label={BRAND_CONFIG.displayName}
            >
              <AlabomLogo
                withWordmark
                markClassName="size-8"
                className="gap-2 text-sm"
              />
            </Link>
            {demoBadge ? (
              <span className="shrink-0 rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                DEMO
              </span>
            ) : null}
            {!businessState && projectName ? (
              <p className="truncate text-sm text-muted-foreground">{projectName}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <JourneyGlobalNav user={user} guestDemoMode={guestDemoMode} />
            <LocaleSwitcher />
          </div>
        </div>
      </header>

      {businessState ? <WorkspaceBusinessStateHeader state={businessState} /> : null}

      {sharedUnderstanding ? (
        <WorkspaceSharedUnderstandingPanel
          understanding={sharedUnderstanding}
          spine={understandingSpine}
        />
      ) : null}

      {!businessState ? <WorkspaceAiPmStrip message={stripMessage} /> : null}

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
