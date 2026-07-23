import { LandingConsultantDemo } from './landing-consultant-demo';
import { LandingBuiltFor } from './landing-built-for';
import { LandingFaq } from './landing-faq';
import { LandingFeatures } from './landing-features';
import { LandingFooter } from './landing-footer';
import { LandingHeader } from './landing-header';
import { LandingHero } from './landing-hero';
import { LandingHowItWorks } from './landing-how-it-works';
import { LandingPricing } from './landing-pricing';
import { LandingRoadmap } from './landing-roadmap';
import { LandingTracker } from './landing-tracker';
import { LandingTrustedBy } from './landing-trusted-by';
import { LandingUseCases } from './landing-use-cases';

export function LandingPage() {
  return (
    <div className="min-h-full bg-white text-zinc-900">
      <LandingTracker />
      <LandingHeader />
      <main>
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
