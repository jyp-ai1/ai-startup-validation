export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { Button, PageHeader } from '@repo/ui';

import { getProject } from '@/features/projects/actions/project-actions';
import { getResearchPlans } from '@/features/research';
import { EvidenceForm } from '@/features/evidence';

type NewEvidencePageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: NewEvidencePageProps): Promise<Metadata> {
  const t = await getTranslations();
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `${t('pages.newEvidence')} | ${project.title} | ${t('meta.titleSuffix')}`
      : `${t('pages.newEvidence')} | ${t('meta.titleSuffix')}`,
  };
}

export default async function NewEvidencePage({ params }: NewEvidencePageProps) {
  const t = await getTranslations('pages');
  const tNav = await getTranslations('common.navLinks');
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const researchPlans = await getResearchPlans(id);

  return (
    <>
      <PageHeader title={t('newEvidence')} description={project.title} />
      <div className="mt-4">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${id}/evidence`}>{tNav('backToEvidence')}</Link>
        </Button>
      </div>
      <div className="mt-8">
        <EvidenceForm
          mode="create"
          projectId={id}
          researchPlans={researchPlans}
        />
      </div>
    </>
  );
}
