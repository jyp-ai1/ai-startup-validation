'use client';

import dynamic from 'next/dynamic';

const Toaster = dynamic(
  () => import('@repo/ui').then((m) => m.Toaster),
  { ssr: false },
);

export function DeferredToaster() {
  return <Toaster position="top-right" richColors closeButton />;
}
