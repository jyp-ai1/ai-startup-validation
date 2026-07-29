import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { buildWorkspaceProjectQuery } from '@/lib/auth/journey-routes';
import { logJourneyRedirect } from '@/lib/auth/journey-redirect-audit';
import { buildPageMetadata } from '@/lib/site/page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    titleKey: 'title',
    descriptionKey: 'nextHint',
    namespace: 'workflow.v2.validation',
    path: '/validation',
  });
}

type ValidationPageProps = {
  searchParams: Promise<{
    demo?: string;
    auth?: string;
    welcome?: string;
    promoted?: string;
    project?: string;
  }>;
};

/** Legacy alias — canonical workspace is /workspace?project= */
export default async function ValidationPage({ searchParams }: ValidationPageProps) {
  const params = await searchParams;
  const destination = `/workspace${buildWorkspaceProjectQuery(params)}`;

  logJourneyRedirect({
    layer: 'server',
    from: '/validation',
    to: destination,
    reason: 'canonical_workspace_alias',
  });

  redirect(destination);
}
