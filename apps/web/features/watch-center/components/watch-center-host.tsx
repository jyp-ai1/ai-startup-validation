'use client';

import { useCallback, useEffect, useState } from 'react';

import type { ProjectDashboardStats } from '@/features/dashboard/types';

import { loadWatchCenter } from '../actions/watch-center-actions';
import type { WatchCenterViewModel } from '../types';
import { WatchCenterPanel } from './watch-center-panel';
import { WatchCenterTrigger } from './watch-center-trigger';

type WatchCenterHostProps = {
  projectId?: string | null;
  userId?: string | null;
  stats?: ProjectDashboardStats | null;
  initialViewModel?: WatchCenterViewModel | null;
  showTrigger?: boolean;
};

export function WatchCenterHost({
  projectId,
  userId,
  stats,
  initialViewModel = null,
  showTrigger = true,
}: WatchCenterHostProps) {
  const [open, setOpen] = useState(false);
  const [viewModel, setViewModel] = useState<WatchCenterViewModel | null>(initialViewModel);

  const refresh = useCallback(async () => {
    if (!projectId || !stats) return;
    const next = await loadWatchCenter({
      projectId,
      userId,
      stats,
    });
    setViewModel(next);
  }, [projectId, userId, stats]);

  useEffect(() => {
    setViewModel(initialViewModel);
  }, [initialViewModel]);

  useEffect(() => {
    function onOpen() {
      setOpen(true);
      void refresh();
    }
    window.addEventListener('launchlens:open-watch-center', onOpen);
    return () => window.removeEventListener('launchlens:open-watch-center', onOpen);
  }, [refresh]);

  if (!projectId || !stats) return null;

  return (
    <>
      {showTrigger ? (
        <WatchCenterTrigger
          unreadCount={viewModel?.unreadCount ?? initialViewModel?.unreadCount ?? 0}
          onClick={() => {
            setOpen(true);
            void refresh();
          }}
        />
      ) : null}
      <WatchCenterPanel
        open={open}
        onOpenChange={setOpen}
        viewModel={viewModel}
        userId={userId}
        onRefresh={() => void refresh()}
      />
    </>
  );
}
