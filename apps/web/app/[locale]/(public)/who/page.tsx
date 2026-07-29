import { redirect } from 'next/navigation';

import { readJourneyPersona } from '@/features/workflow-journey/lib/v2-journey-cookies';
import { buildWorkspaceProjectQuery } from '@/lib/auth/journey-routes';

type WhoPageProps = {
  searchParams: Promise<{
    demo?: string;
    auth?: string;
    project?: string;
    welcome?: string;
    promoted?: string;
  }>;
};

/** Legacy /who — persona gate lives on /workspace?welcome=1 */
export default async function WhoPage({ searchParams }: WhoPageProps) {
  const params = await searchParams;
  const persona = await readJourneyPersona();
  const destination = `/workspace${buildWorkspaceProjectQuery(params)}`;

  if (persona && params.project) {
    redirect(destination);
  }

  redirect(destination);
}
