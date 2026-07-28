import { redirect } from 'next/navigation';

import { legacyProjectCanvasRedirect } from '@/lib/legacy-routes';

export const dynamic = 'force-dynamic';

type InterviewPageProps = {
  params: Promise<{ id: string }>;
};

/** Legacy interview — redirect to Validation Canvas (Sprint 5.1.1 Epic K). */
export default async function InterviewPage({ params }: InterviewPageProps) {
  const { id } = await params;
  redirect(legacyProjectCanvasRedirect(id));
}
