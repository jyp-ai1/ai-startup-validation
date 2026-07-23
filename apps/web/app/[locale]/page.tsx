import { LandingJsonLd } from '@/features/landing/lib/landing-schema';
import { LandingPage, generateLandingMetadata } from '@/features/landing';

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
