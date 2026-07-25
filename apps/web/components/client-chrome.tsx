'use client';

import dynamic from 'next/dynamic';

import { DeferredToaster } from '@/components/deferred-toaster';

const OfflineStatusBanner = dynamic(
  () => import('@/components/offline-status-banner').then((m) => m.OfflineStatusBanner),
  { ssr: false },
);

export function ClientChrome() {
  return (
    <>
      <OfflineStatusBanner />
      <DeferredToaster />
    </>
  );
}
