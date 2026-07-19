import type { Metadata } from 'next';

import { FeatureEmptyPage } from '@/components/feature-empty-page';
import { getNavItem } from '@/lib/navigation';

const nav = getNavItem('/government-grants')!;

export const metadata: Metadata = {
  title: `${nav.label} | AI Startup Validation Framework`,
};

export default function GovernmentGrantsPage() {
  return (
    <FeatureEmptyPage
      title={nav.label}
      description={nav.description}
      emptyTitle="No grant programs matched yet"
      emptyDescription="Discover government support programs relevant to your startup idea."
    />
  );
}
