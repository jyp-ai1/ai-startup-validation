'use client';

import { Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { addToWatchlist, removeFromWatchlist } from '../actions/watch-center-actions';
import type { WatchListItem, WatchType } from '../types';

type WatchListPanelProps = {
  projectId: string;
  userId?: string | null;
  watchlist: WatchListItem[];
  suggestions: WatchListItem[];
  onChange?: () => void;
};

const WATCH_SECTIONS: { type: WatchType; titleKey: string }[] = [
  { type: 'MARKET', titleKey: 'watchList.market' },
  { type: 'COMPETITOR', titleKey: 'watchList.competitor' },
  { type: 'GOVERNMENT', titleKey: 'watchList.government' },
];

export function WatchListPanel({
  projectId,
  userId,
  watchlist,
  suggestions,
  onChange,
}: WatchListPanelProps) {
  const t = useTranslations('watch');
  const { trackEvent } = useAnalytics();

  async function handleAdd(watchType: WatchType, label: string) {
    await addToWatchlist({ projectId, userId, watchType, label });
    trackEvent(ANALYTICS_EVENTS.watchAdd, { project_id: projectId, watch_type: watchType, label });
    onChange?.();
  }

  async function handleRemove(watchId: string, watchType: WatchType) {
    await removeFromWatchlist(projectId, watchId);
    trackEvent(ANALYTICS_EVENTS.watchRemove, { project_id: projectId, watch_type: watchType });
    onChange?.();
  }

  return (
    <div className="space-y-6">
      {WATCH_SECTIONS.map(({ type, titleKey }) => {
        const items = watchlist.filter((item) => item.watchType === type);
        const typeSuggestions = suggestions.filter((item) => item.watchType === type);

        return (
          <section key={type} className="space-y-3">
            <h3 className="text-sm font-semibold">{t(titleKey)}</h3>
            {items.length > 0 ? (
              <ul className="space-y-2">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
                  >
                    <span className="text-sm font-medium">{item.label}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('watchList.remove')}
                      onClick={() => void handleRemove(item.id, type)}
                    >
                      <X className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">{t('watchList.empty')}</p>
            )}
            {typeSuggestions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {typeSuggestions.slice(0, 4).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-1 text-xs',
                      'transition-colors hover:border-primary/40 hover:bg-primary/5',
                    )}
                    onClick={() => void handleAdd(type, item.label)}
                  >
                    <Plus className="size-3" />
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
