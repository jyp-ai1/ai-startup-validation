import type { Metadata } from 'next';

import { FeatureEmptyPage } from '@/components/feature-empty-page';
import { getNavItem } from '@/lib/navigation';

const nav = getNavItem('/settings')!;

export const metadata: Metadata = {
  title: `${nav.label} | AI Startup Validation Framework`,
};

export default function SettingsPage() {
  return (
    <FeatureEmptyPage
      title={nav.label}
      description={nav.description}
      emptyTitle="Workspace settings"
      emptyDescription="Local workspace configuration. Authentication will be added in Sprint 13."
    />
  );
}
