export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ProjectForm } from '@/features/projects';
import { PageHeader } from '@repo/ui';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t('projects.newProject')} | ${t('meta.titleSuffix')}`,
  };
}

export default async function NewProjectPage() {
  const t = await getTranslations('projects');

  return (
    <>
      <PageHeader title={t('newProject')} description={t('newProjectDesc')} />
      <div className="mt-8 max-w-3xl">
        <ProjectForm mode="create" />
      </div>
    </>
  );
}
