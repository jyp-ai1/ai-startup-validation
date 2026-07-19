import type { Metadata } from 'next';

import {
  generateFeaturePickerMetadata,
  GlobalFeaturePickerPage,
} from '@/components/global-feature-picker-page';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return generateFeaturePickerMetadata('/competitors');
}

export default function CompetitorsPage() {
  return (
    <GlobalFeaturePickerPage
      href="/competitors"
      featurePath="competitors"
      actionLabelKey="featurePicker.viewCompetitors"
    />
  );
}
