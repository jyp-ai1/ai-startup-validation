import type { Metadata } from 'next';

import {
  generateFeaturePickerMetadata,
  GlobalFeaturePickerPage,
} from '@/components/global-feature-picker-page';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return generateFeaturePickerMetadata('/evidence');
}

export default function EvidencePage() {
  return (
    <GlobalFeaturePickerPage
      href="/evidence"
      featurePath="evidence"
      actionLabelKey="featurePicker.viewEvidence"
    />
  );
}
