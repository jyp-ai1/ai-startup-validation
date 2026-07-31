import dynamic from 'next/dynamic';

import { LandingHeader } from './landing-header';
import { LandingHero } from './landing-hero';
import { LandingLazySection } from './landing-lazy-section';
import { LandingGtmWhyNarrative } from './landing-gtm-why-narrative';
import { LandingLiveDemoSection } from './landing-live-demo-section';

const LandingHowItWorks = dynamic(
  () => import('./landing-how-it-works').then((m) => m.LandingHowItWorks),
  { loading: () => <div className="min-h-[320px]" aria-hidden /> },
);
const LandingPricing = dynamic(
  () => import('./landing-pricing').then((m) => m.LandingPricing),
  { loading: () => <div className="min-h-[400px]" aria-hidden /> },
);
const LandingFaq = dynamic(
  () => import('./landing-faq').then((m) => m.LandingFaq),
  { loading: () => <div className="min-h-[280px]" aria-hidden /> },
);
const LandingFooter = dynamic(
  () => import('./landing-footer').then((m) => m.LandingFooter),
  { loading: () => <div className="min-h-[160px]" aria-hidden /> },
);
const LandingTracker = dynamic(() => import('./landing-tracker').then((m) => m.LandingTracker));

/** Sprint 2 — Go To Market Foundation: Hero → Why → How → Demo → Pricing → FAQ → CTA */
export async function LandingPage() {
  return (
    <div className="min-h-full bg-background text-foreground">
      <LandingHeader />
      <main id="main-content">
        <LandingHero />
        <LandingGtmWhyNarrative />
        <LandingLazySection minHeight={320}>
          <LandingHowItWorks />
        </LandingLazySection>
        <LandingLiveDemoSection />
        <LandingLazySection minHeight={400}>
          <LandingPricing />
        </LandingLazySection>
        <LandingLazySection minHeight={280}>
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
