import type { Metadata } from 'next';

import { DemoStartView } from '@/features/workflow-journey/components/demo/demo-start-view';
import { BRAND_CONFIG } from '@/lib/brand/brand-config';

export const metadata: Metadata = {
  title: `Demo 시작 | ${BRAND_CONFIG.displayName}`,
};

export default function DemoStartPage() {
  return (
    <main className="min-h-screen bg-background">
      <DemoStartView />
    </main>
  );
}
