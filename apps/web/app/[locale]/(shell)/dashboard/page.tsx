import { redirect } from 'next/navigation';

import { legacyProjectCanvasRedirect } from '@/lib/legacy-routes';

export const dynamic = 'force-dynamic';

type DashboardPageProps = {
  searchParams: Promise<{ project?: string; demo?: string; auth?: string }>;
};

/** Legacy dashboard — redirect to Validation Canvas (Sprint 5.1.1 Epic K). */
export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  redirect(
    legacyProjectCanvasRedirect(params.project ?? null, {
      ...(params.demo ? { demo: params.demo } : {}),
      ...(params.auth ? { auth: params.auth } : {}),
    }),
  );
}
