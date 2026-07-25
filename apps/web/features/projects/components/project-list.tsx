'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import type { ProjectOverviewCard } from '@/features/dashboard/services/dashboard-service';
import { Button } from '@repo/ui';

import { ProjectUndoBanner } from './project-card-menu';
import { ProjectListToolbar } from './project-list-toolbar';
import { ProjectWorkspaceCard } from './project-workspace-card';
import {
  DEFAULT_PROJECT_LIST_FILTERS,
  filterAndSortProjects,
  type ProjectListFilters,
} from '../utils/project-list-utils';
import { WorkspaceEmpty, WorkspaceHeader } from '@/components/workspace';

type ProjectListProps = {
  overviews: ProjectOverviewCard[];
};

export function ProjectList({ overviews }: ProjectListProps) {
  const t = useTranslations();
  const [filters, setFilters] = useState<ProjectListFilters>(DEFAULT_PROJECT_LIST_FILTERS);
  const [undoDelete, setUndoDelete] = useState<{ id: string; title: string } | null>(null);

  const filtered = useMemo(
    () => filterAndSortProjects(overviews, filters),
    [filters, overviews],
  );

  function updateFilters(next: Partial<ProjectListFilters>) {
    setFilters((prev) => ({ ...prev, ...next }));
  }

  return (
    <>
      <WorkspaceHeader
        eyebrow={t('meta.appTagline')}
        title={t('projects.title')}
        description={t('projects.workspaceDesc')}
        actions={
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="size-4" />
              {t('projects.newProject')}
            </Link>
          </Button>
        }
      />

      {overviews.length > 0 ? (
        <ProjectListToolbar
          filters={filters}
          onChange={updateFilters}
          resultCount={filtered.length}
          totalCount={overviews.length}
        />
      ) : null}

      {overviews.length === 0 ? (
        <WorkspaceEmpty
          title={t('projects.emptyTitle')}
          description={t('projects.emptyDescription')}
          primaryAction={{ label: t('projects.newProject'), href: '/projects/new' }}
          recommendationsLabel={t('projects.recommendations.label')}
          recommendations={[
            t('projects.recommendations.sample'),
            t('projects.recommendations.validation'),
            t('projects.recommendations.research'),
          ]}
        />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
          {t('projects.list.noResults')}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
          {filtered.map((overview) => (
            <ProjectWorkspaceCard
              key={overview.project.id}
              overview={overview}
              onUndoDelete={(id, title) => setUndoDelete({ id, title })}
            />
          ))}
        </div>
      )}

      {undoDelete ? (
        <ProjectUndoBanner
          projectId={undoDelete.id}
          title={undoDelete.title}
          onDismiss={() => setUndoDelete(null)}
        />
      ) : null}
    </>
  );
}
