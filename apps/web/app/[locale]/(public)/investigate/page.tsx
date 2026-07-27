import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { readJourneyGoal } from '@/features/workflow-journey';
import { buildPageMetadata } from '@/lib/site/page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    titleKey: 'title',
    namespace: 'workflow.v2.research',
    path: '/investigate',
  });
}

/** Sprint 1.4 — continuous workspace; legacy route redirects. */
export default async function InvestigatePage() {
  const goalId = await readJourneyGoal();
  if (!goalId) {
    redirect('/who');
  }
  redirect('/validation');
}
