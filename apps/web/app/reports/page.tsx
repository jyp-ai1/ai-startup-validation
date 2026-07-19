import type { Metadata } from 'next';

import {
  generateFeaturePickerMetadata,
  GlobalFeaturePickerPage,
} from '@/components/global-feature-picker-page';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return generateFeaturePickerMetadata('/reports');
}

export default function ReportsPage() {
  return (
    <GlobalFeaturePickerPage
      href="/reports"
      featurePath="reports"
      actionLabelKey="featurePicker.viewReports"
    />
  );
}
