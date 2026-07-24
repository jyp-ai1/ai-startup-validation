import dynamic from 'next/dynamic';

import { LandingBuiltFor } from './landing-built-for';
import { LandingFaq } from './landing-faq';
import { LandingFeatures } from './landing-features';
import { LandingFooter } from './landing-footer';
import { LandingHeader } from './landing-header';
import { LandingHero } from './landing-hero';
import { LandingHowItWorks } from './landing-how-it-works';
import { LandingTracker } from './landing-tracker';
import { LandingTrustedBy } from './landing-trusted-by';

const LandingConsultantDemo = dynamic(
  () => import('./landing-consultant-demo').then((m) => m.LandingConsultantDemo),
  { loading: () => <div className="min-h-[320px]" aria-hidden /> },
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

export function LandingPage() {
  return (
    <div className="min-h-full bg-background text-foreground">
      <LandingTracker />
      <LandingHeader />
      <main id="main-content">
        <LandingHero />
        <LandingTrustedBy />
        <LandingHowItWorks />
        <LandingFeatures />
        <LandingConsultantDemo />
        <LandingUseCases />
        <LandingBuiltFor />
        <LandingPricing />
        <LandingRoadmap />
        <LandingFaq />
        <LandingFooter />
      </main>
    </div>
  );
}
