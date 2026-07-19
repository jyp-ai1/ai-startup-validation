import type { Metadata } from 'next';

import { FeatureEmptyPage } from '@/components/feature-empty-page';
import { getNavItem } from '@/lib/navigation';

const nav = getNavItem('/research')!;

export const metadata: Metadata = {
  title: `${nav.label} | AI Startup Validation Framework`,
};

export default function ResearchPage() {
  return (
    <FeatureEmptyPage
      title={nav.label}
      description={nav.description}
      emptyTitle="No research plans yet"
      emptyDescription="Design market research plans after creating a startup project."
    />
  );
}
