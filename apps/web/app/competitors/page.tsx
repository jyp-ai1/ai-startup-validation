import type { Metadata } from 'next';

import { FeatureEmptyPage } from '@/components/feature-empty-page';
import { getNavItem } from '@/lib/navigation';

const nav = getNavItem('/competitors')!;

export const metadata: Metadata = {
  title: `${nav.label} | AI Startup Validation Framework`,
};

export default function CompetitorsPage() {
  return (
    <FeatureEmptyPage
      title={nav.label}
      description={nav.description}
      emptyTitle="No competitors analyzed yet"
      emptyDescription="Map your competitive landscape to understand market positioning."
    />
  );
}
