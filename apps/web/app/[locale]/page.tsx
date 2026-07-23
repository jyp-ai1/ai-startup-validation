import { LandingJsonLd } from '@/features/landing/lib/landing-schema';
import { LandingPage, generateLandingMetadata } from '@/features/landing';

/** Cookie locale must re-resolve messages on every visit. */
export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return generateLandingMetadata();
}

export default async function Home() {
  return (
    <>
      <LandingJsonLd />
      <LandingPage />
    </>
  );
}
