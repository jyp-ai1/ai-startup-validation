import dynamic from 'next/dynamic';

import { LandingHeader } from './landing-header';
import { LandingHero } from './landing-hero';
import { LandingLazySection } from './landing-lazy-section';

const LandingTracker = dynamic(() => import('./landing-tracker').then((m) => m.LandingTracker));

const LandingTrustedBy = dynamic(
  () => import('./landing-trusted-by').then((m) => m.LandingTrustedBy),
  { loading: () => <div className="min-h-[120px]" aria-hidden /> },
);
const LandingHowItWorks = dynamic(
  () => import('./landing-how-it-works').then((m) => m.LandingHowItWorks),
  { loading: () => <div className="min-h-[240px]" aria-hidden /> },
);
const LandingTestimonials = dynamic(
  () => import('./landing-testimonials').then((m) => m.LandingTestimonials),
  { loading: () => <div className="min-h-[200px]" aria-hidden /> },
);
const LandingFooter = dynamic(
  () => import('./landing-footer').then((m) => m.LandingFooter),
  { loading: () => <div className="min-h-[160px]" aria-hidden /> },
);

/** Journey-first landing — below-fold sections lazy-loaded for LCP. */
export async function LandingPage() {
  return (
    <div className="min-h-full bg-background text-foreground">
      <LandingHeader />
      <main id="main-content">
        <LandingHero />
        <LandingLazySection minHeight={120}>
          <LandingTrustedBy />
        </LandingLazySection>
        <LandingLazySection minHeight={240}>
          <LandingHowItWorks />
        </LandingLazySection>
        <LandingLazySection minHeight={200}>
          <LandingTestimonials />
        </LandingLazySection>
        <LandingLazySection minHeight={160}>
          <LandingFooter />
        </LandingLazySection>
      </main>
      <LandingTracker />
    </div>
  );
}
