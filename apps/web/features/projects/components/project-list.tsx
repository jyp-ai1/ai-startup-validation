'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { StartupProject } from '@repo/types/validation';
import { Button, EmptyState, PageHeader } from '@repo/ui';

import { ProjectCard } from './project-card';

type ProjectListProps = {
  projects: StartupProject[];
};

export function ProjectList({ projects }: ProjectListProps) {
  const t = useTranslations();

  if (projects.length === 0) {
    return (
      <>
        <PageHeader
          title={t('projects.title')}
          description={t('projects.description')}
          actions={
            <Button asChild>
              <Link href="/projects/new">
                <Plus className="size-4" />
                {t('projects.newProject')}
              </Link>
            </Button>
          }
        />
        <div className="mt-8">
          <EmptyState
            title={t('projects.emptyTitle')}
            description={t('projects.emptyDescription')}
            action={
              <Button asChild>
                <Link href="/projects/new">{t('projects.newProject')}</Link>
              </Button>
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t('projects.title')}
        description={t('projects.description')}
        actions={
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="size-4" />
              {t('projects.newProject')}
            </Link>
          </Button>
        }
      />
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </>
  );
}
