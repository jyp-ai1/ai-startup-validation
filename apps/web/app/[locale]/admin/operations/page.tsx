import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { OperationsDashboard } from '@/features/operations/components/operations-dashboard';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('operations');
  return {
    title: `${t('title')} | LaunchLens`,
  };
}

export default function OperationsPage() {
  return <OperationsDashboard />;
}
