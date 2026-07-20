export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { AiStudioHub } from '@/features/ai-studio/components/ai-studio-hub';
import { listBusinessPlans } from '@/features/business-plan/services/business-plan-service';
import { listDevelopmentSpecs } from '@/features/development-spec/services/development-spec-service';
import { getProject } from '@/features/projects/actions/project-actions';
import { listPRDs } from '@/features/prd/services/prd-service';
import { listReports } from '@/features/reports/services/report-service';

type AiStudioPageProps = {
  params: Promise<{ id: string }>;
};

type DocPipelineStatus = 'empty' | 'ready' | 'generating' | 'completed';

function resolveDocStatus(
  items: { status: string }[],
  generatingValues: string[],
): DocPipelineStatus {
  if (items.length === 0) return 'empty';
  if (items.some((item) => generatingValues.includes(item.status))) return 'generating';
  if (items.some((item) => item.status === 'COMPLETED')) return 'completed';
  return 'ready';
}

export async function generateMetadata({ params }: AiStudioPageProps): Promise<Metadata> {
  const t = await getTranslations();
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project
      ? `${t('aiStudio.title')} | ${project.title} | ${t('meta.titleSuffix')}`
      : `${t('aiStudio.title')} | ${t('meta.titleSuffix')}`,
  };
}

export default async function AiStudioPage({ params }: AiStudioPageProps) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const [reports, businessPlans, prds, devSpecs] = await Promise.all([
    listReports(id),
    listBusinessPlans(id),
    listPRDs(id),
    listDevelopmentSpecs(id),
  ]);

  return (
    <AiStudioHub
      project={project}
      counts={{
        reports: reports.length,
        businessPlans: businessPlans.length,
        prds: prds.length,
        devSpecs: devSpecs.length,
      }}
      statuses={{
        report: resolveDocStatus(reports, ['IN_PROGRESS']),
        businessPlan: resolveDocStatus(businessPlans, ['GENERATING']),
        prd: resolveDocStatus(prds, ['GENERATING']),
        devSpec: resolveDocStatus(devSpecs, ['GENERATING']),
      }}
    />
  );
}
