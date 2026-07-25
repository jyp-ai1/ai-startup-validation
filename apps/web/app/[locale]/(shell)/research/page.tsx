import type { Metadata } from 'next';

import {
  generateFeaturePickerMetadata,
  GlobalFeaturePickerPage,
} from '@/components/global-feature-picker-page';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return generateFeaturePickerMetadata('/research');
}

export default function ResearchPage() {
  return (
    <GlobalFeaturePickerPage
      href="/research"
      featurePath="research"
      actionLabelKey="featurePicker.viewResearch"
    />
  );
}
