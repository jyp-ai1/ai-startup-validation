import type { Metadata } from 'next';

import {
  generateFeaturePickerMetadata,
  GlobalFeaturePickerPage,
} from '@/components/global-feature-picker-page';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return generateFeaturePickerMetadata('/voc');
}

export default function VocPage() {
  return (
    <GlobalFeaturePickerPage
      href="/voc"
      featurePath="voc"
      actionLabelKey="featurePicker.viewVoc"
    />
  );
}
