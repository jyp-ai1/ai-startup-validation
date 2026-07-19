export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';

import { DbSetupBanner } from '@/features/projects/components/db-setup-banner';
import { ProjectList } from '@/features/projects';
import { getProjects } from '@/features/projects/actions/project-actions';
import { getNavItem } from '@/lib/navigation';

const nav = getNavItem('/projects')!;

export const metadata: Metadata = {
  title: `${nav.label} | AI Startup Validation Framework`,
};

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <>
      <DbSetupBanner className="mb-6" />
      <ProjectList projects={projects} />
    </>
  );
}
