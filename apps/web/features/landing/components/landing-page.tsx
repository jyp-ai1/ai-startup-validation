import dynamic from 'next/dynamic';

import { LandingHeader } from './landing-header';
import { LandingHero } from './landing-hero';
import { LandingLazySection } from './landing-lazy-section';

const LandingTracker = dynamic(() => import('./landing-tracker').then((m) => m.LandingTracker));

const LandingHowItWorks = dynamic(
  () => import('./landing-how-it-works').then((m) => m.LandingHowItWorks),
  { loading: () => <div className="min-h-[240px]" aria-hidden /> },
);
const LandingFeatures = dynamic(
  () => import('./landing-features').then((m) => m.LandingFeatures),
  { loading: () => <div className="min-h-[240px]" aria-hidden /> },
);
const LandingUseCases = dynamic(
  () => import('./landing-use-cases').then((m) => m.LandingUseCases),
  { loading: () => <div className="min-h-[240px]" aria-hidden /> },
);
const LandingPricing = dynamic(
  () => import('./landing-pricing').then((m) => m.LandingPricing),
  { loading: () => <div className="min-h-[240px]" aria-hidden /> },
);
const LandingRoadmap = dynamic(
  () => import('./landing-roadmap').then((m) => m.LandingRoadmap),
  { loading: () => <div className="min-h-[200px]" aria-hidden /> },
);
const LandingFaq = dynamic(
  () => import('./landing-faq').then((m) => m.LandingFaq),
  { loading: () => <div className="min-h-[200px]" aria-hidden /> },
);
const LandingFooter = dynamic(
  () => import('./landing-footer').then((m) => m.LandingFooter),
  { loading: () => <div className="min-h-[160px]" aria-hidden /> },
);

/** MVP landing — hero + journey first; pricing/roadmap/faq deferred (P0 hotfix). */
export async function LandingPage() {
  return (
    <div className="min-h-full bg-background text-foreground">
      <LandingHeader />
      <main id="main-content">
        <LandingHero />
        <LandingLazySection minHeight={240}>
          <LandingHowItWorks />
        </LandingLazySection>
        <LandingLazySection minHeight={240}>
          <LandingFeatures />
        </LandingLazySection>
        <LandingLazySection minHeight={240}>
          <LandingUseCases />
        </LandingLazySection>
        <LandingLazySection minHeight={240}>
          <LandingPricing />
        </LandingLazySection>
        <LandingLazySection minHeight={200}>
          <LandingRoadmap />
        </LandingLazySection>
        <LandingLazySection minHeight={200}>
          <LandingFaq />
        </LandingLazySection>
        <LandingLazySection minHeight={160}>
          <LandingFooter />
        </LandingLazySection>
      </main>
      <LandingTracker />
    </div>
  );
}
