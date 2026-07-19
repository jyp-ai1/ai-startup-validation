import type { Metadata } from 'next';

import { FeatureEmptyPage } from '@/components/feature-empty-page';
import { getNavItem } from '@/lib/navigation';

const nav = getNavItem('/evidence')!;

export const metadata: Metadata = {
  title: `${nav.label} | AI Startup Validation Framework`,
};

export default function EvidencePage() {
  return (
    <FeatureEmptyPage
      title={nav.label}
      description={nav.description}
      emptyTitle="No evidence collected yet"
      emptyDescription="Gather market data, reports, and references to support your validation."
    />
  );
}
