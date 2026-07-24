import dynamic from 'next/dynamic';

import { LandingHeader } from './landing-header';
import { LandingHero } from './landing-hero';

const LandingTracker = dynamic(() => import('./landing-tracker').then((m) => m.LandingTracker));

const LandingTrustedBy = dynamic(
  () => import('./landing-trusted-by').then((m) => m.LandingTrustedBy),
  { loading: () => <div className="min-h-[120px]" aria-hidden /> },
);
const LandingHowItWorks = dynamic(
  () => import('./landing-how-it-works').then((m) => m.LandingHowItWorks),
  { loading: () => <div className="min-h-[240px]" aria-hidden /> },
);
const LandingFeatures = dynamic(
  () => import('./landing-features').then((m) => m.LandingFeatures),
  { loading: () => <div className="min-h-[240px]" aria-hidden /> },
);
const LandingConsultantDemo = dynamic(
  () => import('./landing-consultant-demo').then((m) => m.LandingConsultantDemo),
  { loading: () => <div className="min-h-[320px]" aria-hidden /> },
);
const LandingUseCases = dynamic(
  () => import('./landing-use-cases').then((m) => m.LandingUseCases),
  { loading: () => <div className="min-h-[240px]" aria-hidden /> },
);
const LandingBuiltFor = dynamic(
  () => import('./landing-built-for').then((m) => m.LandingBuiltFor),
  { loading: () => <div className="min-h-[200px]" aria-hidden /> },
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
