'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

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

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

export function WorkspacePolishHost({
  projectId,
  project,
  stats,
  intelligence,
  recentProjects = [],
}: WorkspacePolishHostProps) {
  const router = useRouter();
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const gPendingRef = useRef(false);
  const gTimerRef = useRef<number | null>(null);

  useEffect(() => {
    function clearGTimer() {
      if (gTimerRef.current !== null) {
        window.clearTimeout(gTimerRef.current);
        gTimerRef.current = null;
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;

      const isMod = event.metaKey || event.ctrlKey;

      if (event.key === 'Escape') {
        setCommandOpen(false);
        setSearchOpen(false);
        gPendingRef.current = false;
        clearGTimer();
        return;
      }

      if (isMod && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
        return;
      }

      if (event.key === '/' && !isMod) {
        event.preventDefault();
        setSearchOpen(true);
        return;
      }

      if (event.key.toLowerCase() === 'g' && !isMod) {
        gPendingRef.current = true;
        clearGTimer();
        gTimerRef.current = window.setTimeout(() => {
          gPendingRef.current = false;
        }, 1200);
        return;
      }

      if (gPendingRef.current) {
        if (event.key.toLowerCase() === 'd') {
          event.preventDefault();
          gPendingRef.current = false;
          clearGTimer();
          router.push('/dashboard');
        }
        if (event.key.toLowerCase() === 'p' && projectId) {
          event.preventDefault();
          gPendingRef.current = false;
          clearGTimer();
          router.push(`/projects/${projectId}`);
        }
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      clearGTimer();
    };
  }, [projectId, router]);

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
