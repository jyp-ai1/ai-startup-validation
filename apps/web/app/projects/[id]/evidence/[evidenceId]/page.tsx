export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/actions/project-actions';
import { getEvidenceDetail, EvidenceDetail } from '@/features/evidence';
import { getResearchPlan, getResearchPlans } from '@/features/research';

type EvidenceDetailPageProps = {
  params: Promise<{ id: string; evidenceId: string }>;
};

export async function generateMetadata({
  params,
}: EvidenceDetailPageProps): Promise<Metadata> {
  const { id, evidenceId } = await params;
  const evidence = await getEvidenceDetail(id, evidenceId);

  return {
    title: evidence
      ? `${evidence.title} | AI Startup Validation Framework`
      : 'Evidence | AI Startup Validation Framework',
  };
}

export default async function EvidenceDetailPage({
  params,
}: EvidenceDetailPageProps) {
  const { id, evidenceId } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const evidence = await getEvidenceDetail(id, evidenceId);

  if (!evidence) {
    notFound();
  }

  const researchPlans = await getResearchPlans(id);
  const linkedResearch = evidence.researchId
    ? await getResearchPlan(id, evidence.researchId)
    : null;

  return (
    <EvidenceDetail
      project={project}
      evidence={evidence}
      researchPlans={researchPlans}
      linkedResearch={linkedResearch}
    />
  );
}
