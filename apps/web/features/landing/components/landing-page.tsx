import dynamic from 'next/dynamic';

import { LandingHeader } from './landing-header';
import { LandingHero } from './landing-hero';
import { LandingLazySection } from './landing-lazy-section';
import { LandingAiPmSection } from './landing-ai-pm-section';
import { LandingBeforeAfter } from './landing-before-after';
import { LandingJourneySection } from './landing-journey-section';
import { LandingStorySection } from './landing-story-section';
import { LandingWhySection } from './landing-why-section';

const LandingTracker = dynamic(() => import('./landing-tracker').then((m) => m.LandingTracker));

const LandingTrustedBy = dynamic(
  () => import('./landing-trusted-by').then((m) => m.LandingTrustedBy),
  { loading: () => <div className="min-h-[120px]" aria-hidden /> },
);
const LandingTestimonials = dynamic(
  () => import('./landing-testimonials').then((m) => m.LandingTestimonials),
  { loading: () => <div className="min-h-[200px]" aria-hidden /> },
);
const LandingFaq = dynamic(
  () => import('./landing-faq').then((m) => m.LandingFaq),
  { loading: () => <div className="min-h-[280px]" aria-hidden /> },
);
const LandingFooter = dynamic(
  () => import('./landing-footer').then((m) => m.LandingFooter),
  { loading: () => <div className="min-h-[160px]" aria-hidden /> },
);

export async function LandingPage() {
  return (
    <div className="min-h-full bg-background text-foreground">
      <LandingHeader />
      <main id="main-content">
        <LandingHero />
        <LandingLazySection minHeight={120}>
          <LandingTrustedBy />
        </LandingLazySection>
        <LandingStorySection />
        <LandingBeforeAfter />
        <LandingJourneySection />
        <LandingWhySection />
        <LandingAiPmSection />
        <LandingLazySection minHeight={200}>
          <LandingTestimonials />
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
