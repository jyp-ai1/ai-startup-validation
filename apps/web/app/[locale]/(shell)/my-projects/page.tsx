import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { MyProjectsHome } from '@/features/my-projects';
import { listMyProjectsForPage } from '@/features/my-projects/actions/my-project-actions';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('myProjects');
  const tm = await getTranslations('meta');
  return {
    title: `${t('pageTitle')} | ${tm('titleSuffix')}`,
  };
}

export default async function MyProjectsPage() {
  const { user, projects, dbReady } = await listMyProjectsForPage();

  return (
    <MyProjectsHome
      userName={user.fullName}
      userEmail={user.email}
      projects={projects}
      dbReady={dbReady}
    />
  );
}
