'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import type { ProjectDashboardStats } from '@/features/dashboard/types';
import type { IntelligenceViewModel } from '@/features/project-intelligence';
import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
} from '@repo/ui';
import type { StartupProject } from '@repo/types/validation';

import { buildWorkspaceSearchIndex, filterSearchItems } from '../services/search-index-service';

type WorkspaceSearchProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: StartupProject | null;
  stats?: ProjectDashboardStats | null;
  intelligence?: IntelligenceViewModel | null;
  projectId?: string | null;
  recentProjects?: Pick<StartupProject, 'id' | 'title'>[];
};

export function WorkspaceSearch({
  open,
  onOpenChange,
  project,
  stats,
  intelligence,
  projectId,
  recentProjects = [],
}: WorkspaceSearchProps) {
  const t = useTranslations('polish.search');
  const { trackEvent } = useAnalytics();
  const [query, setQuery] = useState('');

  const items = useMemo(() => {
    if (project && stats) {
      return buildWorkspaceSearchIndex({ project, stats, intelligence });
    }
    return recentProjects.map((p) => ({
      id: p.id,
      category: 'project' as const,
      title: p.title,
      href: `/projects/${p.id}`,
    }));
  }, [project, stats, intelligence, recentProjects]);

  const filtered = useMemo(() => filterSearchItems(items, query), [items, query]);

  function handleSelect(href: string) {
    trackEvent(ANALYTICS_EVENTS.workspaceSearch, {
      project_id: projectId ?? project?.id,
      query,
      screen: href,
    });
    onOpenChange(false);
    setQuery('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="sr-only">{t('title')}</DialogTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('placeholder')}
              className="border-0 pl-9 shadow-none focus-visible:ring-0"
              autoFocus
            />
          </div>
        </DialogHeader>
        <ul className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">{t('empty')}</li>
          ) : (
            filtered.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={() => handleSelect(item.href)}
                  className="flex flex-col gap-0.5 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60"
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {t(`categories.${item.category}` as 'categories.project')}
                  </span>
                  <span className="text-sm font-medium">{item.title}</span>
                  {item.subtitle ? (
                    <span className="truncate text-xs text-muted-foreground">{item.subtitle}</span>
                  ) : null}
                </Link>
              </li>
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
