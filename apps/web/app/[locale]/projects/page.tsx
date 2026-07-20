import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { buildProjectsOverview } from '@/features/dashboard/services/dashboard-service';
import { DbSetupBanner } from '@/features/projects/components/db-setup-banner';
import { ProjectList } from '@/features/projects';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t('nav.projects')} | ${t('meta.titleSuffix')}`,
  };
}

export default async function ProjectsPage() {
  const overviews = await buildProjectsOverview();

  return (
    <>
      <DbSetupBanner className="mb-6" />
      <ProjectList overviews={overviews} />
    </>
  );
}
