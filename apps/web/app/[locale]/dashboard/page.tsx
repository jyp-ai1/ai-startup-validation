import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { DashboardHome } from '@/components/dashboard-home';
import { listStartupProjects } from '@/features/projects/services/project-service';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t('nav.dashboard')} | ${t('meta.titleSuffix')}`,
  };
}

export default async function DashboardPage() {
  const projects = await listStartupProjects();

  return <DashboardHome projectCount={projects.length} />;
}
