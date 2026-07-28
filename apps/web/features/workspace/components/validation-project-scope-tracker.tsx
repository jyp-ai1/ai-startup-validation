'use client';

import { useSearchParams } from 'next/navigation';

import { ProjectScopeTracker } from '@/features/my-projects/components/project-scope-tracker';

/** Sets active project + clears bleed when ?project= is present on /validation. */
export function ValidationProjectScopeTracker() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');
  const welcome = searchParams.get('welcome') === '1';

  if (!projectId) return null;

  return <ProjectScopeTracker projectId={projectId} isNewProject={welcome} />;
}
