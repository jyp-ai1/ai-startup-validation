'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { WatchCenterViewModel } from '../types';
import { AiDailyBriefing } from './ai-daily-briefing';
import { NotificationInbox } from './notification-inbox';
import { NotificationSettingsPanel } from './notification-settings-panel';
import { WatchListPanel } from './watch-list-panel';

type WatchCenterPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewModel: WatchCenterViewModel | null;
  userId?: string | null;
  onRefresh?: () => void;
};

type TabId = 'inbox' | 'watch' | 'settings';

export function WatchCenterPanel({
  open,
  onOpenChange,
  viewModel,
  userId,
  onRefresh,
}: WatchCenterPanelProps) {
  const t = useTranslations('watch');
  const { trackEvent } = useAnalytics();
  const [tab, setTab] = useState<TabId>('inbox');
  const [localSettings, setLocalSettings] = useState(viewModel?.settings ?? null);

  const settings = localSettings ?? viewModel?.settings;

  if (!viewModel || !settings) return null;

  function handleOpenChange(next: boolean) {
    if (next && viewModel) {
      trackEvent(ANALYTICS_EVENTS.notificationView, {
        project_id: viewModel.projectId,
        unread_count: viewModel.unreadCount,
      });
    }
    onOpenChange(next);
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'inbox', label: t('tabs.inbox') },
    { id: 'watch', label: t('tabs.watch') },
    { id: 'settings', label: t('tabs.settings') },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-left">
            {t('panel.title')}
            {viewModel.unreadCount > 0 ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {viewModel.unreadCount}
              </span>
            ) : null}
          </DialogTitle>
          <p className="text-left text-sm text-muted-foreground">{t('panel.subtitle')}</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <AiDailyBriefing projectId={viewModel.projectId} summary={viewModel.aiSummary} />

          <div className="mt-6 flex gap-1 rounded-lg border border-border/60 bg-muted/30 p-1">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  tab === item.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {tab === 'inbox' ? (
              <NotificationInbox
                projectId={viewModel.projectId}
                notifications={viewModel.notifications}
                onChange={onRefresh}
              />
            ) : null}
            {tab === 'watch' ? (
              <WatchListPanel
                projectId={viewModel.projectId}
                userId={userId}
                watchlist={viewModel.watchlist}
                suggestions={viewModel.defaultWatchSuggestions}
                onChange={onRefresh}
              />
            ) : null}
            {tab === 'settings' ? (
              <NotificationSettingsPanel
                projectId={viewModel.projectId}
                userId={userId}
                settings={settings}
                onChange={(next) => {
                  setLocalSettings(next);
                  onRefresh?.();
                }}
              />
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
