import type { Metadata } from 'next';

import {
  generateFeaturePickerMetadata,
  GlobalFeaturePickerPage,
} from '@/components/global-feature-picker-page';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return generateFeaturePickerMetadata('/validation-score');
}

export default function ValidationScorePage() {
  return (
    <GlobalFeaturePickerPage
      href="/validation-score"
      featurePath="validation"
      actionLabelKey="featurePicker.viewValidation"
    />
  );
}
