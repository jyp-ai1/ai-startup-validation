'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PROJECT_TYPES, STARTUP_PROJECT_STATUSES } from '@repo/types/validation';
import { Input } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { ProjectListFilters, ProjectSortKey } from '../utils/project-list-utils';

const selectClassName = cn(
  'h-9 min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none',
  'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
  'dark:bg-input/30',
);

type ProjectListToolbarProps = {
  filters: ProjectListFilters;
  onChange: (next: Partial<ProjectListFilters>) => void;
  resultCount: number;
  totalCount: number;
};

export function ProjectListToolbar({
  filters,
  onChange,
  resultCount,
  totalCount,
}: ProjectListToolbarProps) {
  const t = useTranslations('projects.list');

  return (
    <div className="mb-6 space-y-4 rounded-2xl border border-border/70 bg-card p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.query}
          onChange={(event) => onChange({ query: event.target.value })}
          placeholder={t('searchPlaceholder')}
          className="pl-9"
          aria-label={t('searchPlaceholder')}
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="min-w-[140px] flex-1 space-y-1.5">
          <label htmlFor="project-sort" className="text-xs font-medium text-muted-foreground">
            {t('sort')}
          </label>
          <select
            id="project-sort"
            value={filters.sort}
            onChange={(event) => onChange({ sort: event.target.value as ProjectSortKey })}
            className={cn(selectClassName, 'w-full')}
          >
            {( ['updated', 'created', 'title', 'score'] as const).map((key) => (
              <option key={key} value={key}>
                {t(`sortOptions.${key}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[140px] flex-1 space-y-1.5">
          <label htmlFor="project-status" className="text-xs font-medium text-muted-foreground">
            {t('status')}
          </label>
          <select
            id="project-status"
            value={filters.status}
            onChange={(event) =>
              onChange({ status: event.target.value as ProjectListFilters['status'] })
            }
            className={cn(selectClassName, 'w-full')}
          >
            <option value="ALL">{t('all')}</option>
            {STARTUP_PROJECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[140px] flex-1 space-y-1.5">
          <label htmlFor="project-type" className="text-xs font-medium text-muted-foreground">
            {t('type')}
          </label>
          <select
            id="project-type"
            value={filters.projectType}
            onChange={(event) =>
              onChange({ projectType: event.target.value as ProjectListFilters['projectType'] })
            }
            className={cn(selectClassName, 'w-full')}
          >
            <option value="ALL">{t('all')}</option>
            {PROJECT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-4 pb-1 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.showArchived}
              onChange={(event) => onChange({ showArchived: event.target.checked })}
              className="size-4 rounded border-input"
            />
            {t('showArchived')}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.pinnedOnly}
              onChange={(event) => onChange({ pinnedOnly: event.target.checked })}
              className="size-4 rounded border-input"
            />
            {t('pinnedOnly')}
          </label>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {t('resultCount', { shown: resultCount, total: totalCount })}
      </p>
    </div>
  );
}
