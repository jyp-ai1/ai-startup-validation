import type { Metadata } from 'next';

import { DemoStartView } from '@/features/workflow-journey/components/demo/demo-start-view';

export const metadata: Metadata = {
  title: 'Demo 시작 | LaunchLens',
};

export default function DemoStartPage() {
  return (
    <main className="min-h-screen bg-background">
      <DemoStartView />
    </main>
  );
}
