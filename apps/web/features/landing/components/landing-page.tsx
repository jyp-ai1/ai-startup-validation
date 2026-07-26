import dynamic from 'next/dynamic';

import { LandingHeader } from './landing-header';
import { LandingHero } from './landing-hero';
import { LandingLazySection } from './landing-lazy-section';

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
const LandingStorySection = dynamic(
  () => import('./landing-story-section').then((m) => m.LandingStorySection),
  { loading: () => <div className="min-h-[240px]" aria-hidden /> },
);
const LandingBeforeAfter = dynamic(
  () => import('./landing-before-after').then((m) => m.LandingBeforeAfter),
  { loading: () => <div className="min-h-[280px]" aria-hidden /> },
);
const LandingJourneySection = dynamic(
  () => import('./landing-journey-section').then((m) => m.LandingJourneySection),
  { loading: () => <div className="min-h-[320px]" aria-hidden /> },
);
const LandingWhySection = dynamic(
  () => import('./landing-why-section').then((m) => m.LandingWhySection),
  { loading: () => <div className="min-h-[240px]" aria-hidden /> },
);
const LandingAiPmSection = dynamic(
  () => import('./landing-ai-pm-section').then((m) => m.LandingAiPmSection),
  { loading: () => <div className="min-h-[280px]" aria-hidden /> },
);
const LandingWorkspacePreviewSection = dynamic(
  () =>
    import('./landing-workspace-preview-section').then((m) => m.LandingWorkspacePreviewSection),
  { loading: () => <div className="min-h-[320px]" aria-hidden /> },
);

export async function LandingPage() {
  return (
    <div className="min-h-full bg-background text-foreground">
      <LandingHeader />
      <main id="main-content">
        <LandingHero />
        <LandingLazySection minHeight={320}>
          <LandingWorkspacePreviewSection />
        </LandingLazySection>
        <LandingLazySection minHeight={120}>
          <LandingTrustedBy />
        </LandingLazySection>
        <LandingLazySection minHeight={240}>
          <LandingStorySection />
        </LandingLazySection>
        <LandingLazySection minHeight={280}>
          <LandingBeforeAfter />
        </LandingLazySection>
        <LandingLazySection minHeight={320}>
          <LandingJourneySection />
        </LandingLazySection>
        <LandingLazySection minHeight={240}>
          <LandingWhySection />
        </LandingLazySection>
        <LandingLazySection minHeight={280}>
          <LandingAiPmSection />
        </LandingLazySection>
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
