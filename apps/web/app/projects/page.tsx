import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { DbSetupBanner } from '@/features/projects/components/db-setup-banner';
import { ProjectList } from '@/features/projects';
import { getProjects } from '@/features/projects/actions/project-actions';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t('nav.projects')} | ${t('meta.titleSuffix')}`,
  };
}

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <>
      <DbSetupBanner className="mb-6" />
      <ProjectList projects={projects} />
    </>
  );
}
