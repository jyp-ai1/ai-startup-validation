'use client';

import { useEffect, useState } from 'react';

import type { ProjectDashboardStats } from '@/features/dashboard/types';
import type { IntelligenceViewModel } from '@/features/project-intelligence';
import type { StartupProject } from '@repo/types/validation';

import { WorkspaceCommandPalette } from './workspace-command-palette';
import { WorkspaceSearch } from './workspace-search';

type WorkspacePolishHostProps = {
  projectId?: string | null;
  project?: StartupProject | null;
  stats?: ProjectDashboardStats | null;
  intelligence?: IntelligenceViewModel | null;
  recentProjects?: Pick<StartupProject, 'id' | 'title'>[];
};

export function WorkspacePolishHost({
  projectId,
  project,
  stats,
  intelligence,
  recentProjects = [],
}: WorkspacePolishHostProps) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isMod = event.metaKey || event.ctrlKey;
      if (isMod && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    function onSearchOpen() {
      setSearchOpen(true);
    }
    window.addEventListener('launchlens:open-search', onSearchOpen);
    return () => window.removeEventListener('launchlens:open-search', onSearchOpen);
  }, []);

  return (
    <>
      <WorkspaceCommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        projectId={projectId}
        onSearchOpen={() => {
          setCommandOpen(false);
          setSearchOpen(true);
        }}
      />
      <WorkspaceSearch
        open={searchOpen}
        onOpenChange={setSearchOpen}
        project={project}
        stats={stats}
        intelligence={intelligence}
        projectId={projectId}
        recentProjects={recentProjects}
      />
    </>
  );
}

export function openWorkspaceSearch(): void {
  window.dispatchEvent(new CustomEvent('launchlens:open-search'));
}
