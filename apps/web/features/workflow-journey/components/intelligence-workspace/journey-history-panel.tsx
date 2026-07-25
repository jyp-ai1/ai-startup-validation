'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Download,
  GitBranch,
  Layers,
  MessageCircle,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';

import { formatRelativeTime } from '@repo/utils/date';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  groupJourneyHistoryByBucket,
  isToday,
  type JourneyHistoryCategory,
  type JourneyHistoryEntry,
} from '../../lib/journey-history-store';
import { useJourneyHistory } from '../../hooks/use-journey-history';
import { JourneyAchievementsPanel } from './journey-achievements-panel';
import { JourneyAiMemoryPanel } from './journey-ai-memory-panel';

const FILTER_KEYS = ['all', 'decision', 'coach', 'evidence', 'workflow', 'activity'] as const;
type HistoryFilter = (typeof FILTER_KEYS)[number];

const CATEGORY_ICONS: Record<JourneyHistoryCategory, typeof Sparkles> = {
  decision: GitBranch,
  coach: MessageCircle,
  evidence: Zap,
  workflow: Layers,
  activity: Sparkles,
};

const BUCKET_ORDER = ['today', 'yesterday', 'thisWeek', 'earlier'] as const;

type JourneyHistoryPanelProps = {
  projectId: string;
};

export function JourneyHistoryPanel({ projectId }: JourneyHistoryPanelProps) {
  const t = useTranslations('workflow.epic3.historyPanel');
  const tt = useTranslations('workflow.epic3.timeline');
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const { entries, removeWithUndo } = useJourneyHistory(projectId);

  const filtered = useMemo(() => {
    if (filter === 'all') return entries;
    return entries.filter((entry) => entry.category === filter);
  }, [entries, filter]);

  const grouped = useMemo(() => groupJourneyHistoryByBucket(filtered), [filtered]);
  const dailyActivity = useMemo(() => entries.filter((entry) => isToday(entry.occurredAt)), [entries]);

  function titleFor(entry: JourneyHistoryEntry): string {
    if (entry.category === 'decision' || entry.category === 'workflow' || entry.category === 'activity') {
      try {
        return tt(`entries.${entry.title}` as 'entries.projectStart');
      } catch {
        return entry.title;
      }
    }
    return entry.title;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
        <h3 className="text-base font-semibold tracking-tight sm:text-lg">{t('title')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t('desc')}</p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('filterLabel')}>
          {FILTER_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                filter === key
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border/60 text-muted-foreground hover:text-foreground',
              )}
            >
              {t(`filters.${key}`)}
            </button>
          ))}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              const payload = {
                projectId,
                exportedAt: new Date().toISOString(),
                filter,
                entries: filtered,
              };
              const blob = new Blob([JSON.stringify(payload, null, 2)], {
                type: 'application/json;charset=utf-8',
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `launchlens-history-${projectId.slice(0, 8)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            disabled={filtered.length === 0}
          >
            <Download className="size-4" aria-hidden />
            {t('export')}
          </Button>
        </div>

        {dailyActivity.length > 0 ? (
          <div className="mt-6 rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              {t('dailyActivity')}
            </p>
            <ul className="mt-3 space-y-2" role="list">
              {dailyActivity.slice(0, 5).map((entry) => (
                <li key={entry.id} className="flex items-center gap-2 text-sm">
                  <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{titleFor(entry)}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelativeTime(new Date(entry.occurredAt))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-6 space-y-6">
          {filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
              {t('empty')}
            </p>
          ) : (
            BUCKET_ORDER.map((bucket) => {
              const bucketEntries = grouped[bucket];
              if (bucketEntries.length === 0) return null;
              return (
                <div key={bucket} className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t(`buckets.${bucket}`)}
                  </h4>
                  <ol className="space-y-2" role="list">
                    {bucketEntries.map((entry) => {
                      const Icon = CATEGORY_ICONS[entry.category];
                      return (
                        <li
                          key={entry.id}
                          className="group flex items-start gap-3 rounded-xl border border-border/50 bg-muted/15 px-3 py-2.5"
                        >
                          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <Icon className="size-3.5 text-primary" aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{titleFor(entry)}</p>
                            {entry.summary ? (
                              <p className="mt-0.5 text-xs text-muted-foreground">{entry.summary}</p>
                            ) : null}
                            {entry.value ? (
                              <p className="mt-1 text-xs font-semibold text-primary">{entry.value}</p>
                            ) : null}
                            <time className="mt-1 block text-[11px] text-muted-foreground">
                              {formatRelativeTime(new Date(entry.occurredAt))}
                            </time>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                            aria-label={t('remove')}
                            onClick={() => removeWithUndo(entry.id, titleFor(entry))}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              );
            })
          )}
        </div>
      </section>

      <JourneyAiMemoryPanel />
      <JourneyAchievementsPanel />
    </div>
  );
}
