import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Button, EmptyState, PageHeader } from '@repo/ui';

import { listStartupProjects } from '@/features/projects/services/project-service';
import { getNavItemConfig } from '@/lib/navigation';

type GlobalFeaturePickerPageProps = {
  href: string;
  featurePath: string;
  actionLabelKey: string;
};

export async function generateFeaturePickerMetadata(href: string): Promise<Metadata> {
  const t = await getTranslations();
  const config = getNavItemConfig(href);
  if (!config) return { title: t('meta.titleSuffix') };
  return {
    title: `${t(config.labelKey)} | ${t('meta.titleSuffix')}`,
  };
}

export async function GlobalFeaturePickerPage({
  href,
  featurePath,
  actionLabelKey,
}: GlobalFeaturePickerPageProps) {
  const t = await getTranslations();
  const config = getNavItemConfig(href);
  if (!config) return null;

  const projects = await listStartupProjects();

  if (projects.length === 0) {
    return (
      <>
        <PageHeader title={t(config.labelKey)} description={t(config.descKey)} />
        <div className="mt-8">
          <EmptyState
            title={t('features.noProjects')}
            description={t('features.selectProjectDesc')}
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
        title={t(config.labelKey)}
        description={t('features.selectProjectDesc')}
      />
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {projects.map((project) => (
          <div
            key={project.id}
            className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{project.title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{project.summary}</p>
            </div>
            <Button variant="outline" className="shrink-0" asChild>
              <Link href={`/projects/${project.id}/${featurePath}`}>
                {t(actionLabelKey)}
              </Link>
            </Button>
          </div>
        ))}
      </div>
    </>
  );
}
