'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { ProjectOverviewCard } from '@/features/dashboard/services/dashboard-service';
import { Button } from '@repo/ui';

import { ProjectWorkspaceCard } from './project-workspace-card';
import { WorkspaceEmpty, WorkspaceHeader } from '@/components/workspace';

type ProjectListProps = {
  overviews: ProjectOverviewCard[];
};

export function ProjectList({ overviews }: ProjectListProps) {
  const t = useTranslations();

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
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
          {overviews.map((overview) => (
            <ProjectWorkspaceCard key={overview.project.id} overview={overview} />
          ))}
        </div>
      )}
    </>
  );
}
