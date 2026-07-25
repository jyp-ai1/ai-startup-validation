import { LandingJsonLd } from '@/features/landing/lib/landing-schema';
import { LandingPage, generateLandingMetadata } from '@/features/landing';

export async function generateMetadata() {
  return generateLandingMetadata();
}

export const revalidate = 3600;

export default async function Home() {
  return (
    <>
      <LandingJsonLd />
      <LandingPage />
    </>
  );
}
