'use client';

import dynamic from 'next/dynamic';

import { LandingLazySection } from './landing-lazy-section';

const LandingHeroPreview = dynamic(
  () => import('./landing-hero-preview').then((m) => m.LandingHeroPreview),
  {
    ssr: false,
    loading: () => (
      <div
        className="aspect-[4/3] w-full rounded-[20px] border border-border/60 bg-muted/40"
        aria-hidden
      />
    ),
  },
);

export function LandingHeroPreviewLazy() {
  return (
    <div className="relative hidden lg:block lg:pl-4">
      <div className="pointer-events-none absolute -inset-4 rounded-[28px] bg-gradient-to-br from-violet-100/40 to-transparent blur-2xl" />
      <LandingLazySection minHeight={320} rootMargin="160px 0px">
        <LandingHeroPreview className="relative" />
      </LandingLazySection>
    </div>
  );
}
