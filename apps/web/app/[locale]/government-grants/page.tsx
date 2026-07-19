import type { Metadata } from 'next';

import {
  generateFeaturePickerMetadata,
  GlobalFeaturePickerPage,
} from '@/components/global-feature-picker-page';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return generateFeaturePickerMetadata('/government-grants');
}

export default function GovernmentGrantsPage() {
  return (
    <GlobalFeaturePickerPage
      href="/government-grants"
      featurePath="grants"
      actionLabelKey="featurePicker.viewGrants"
    />
  );
}
