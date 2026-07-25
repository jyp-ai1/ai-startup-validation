'use client';

import { ArrowRight } from 'lucide-react';

import { LandingCtaLink } from './landing-cta-link';

type LandingHeroActionsProps = {
  ctaStart: string;
  ctaHint1: string;
  ctaHint2: string;
  speedPromise: string;
};

export function LandingHeroActions({
  ctaStart,
  ctaHint1,
  ctaHint2,
  speedPromise,
}: LandingHeroActionsProps) {
  return (
    <>
      <p className="mt-6 text-sm font-medium text-primary">{speedPromise}</p>
      <div className="mt-4">
        <LandingCtaLink
          href="/goal"
          event="cta_start"
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 sm:w-auto"
        >
          {ctaStart}
          <ArrowRight className="size-4" aria-hidden />
        </LandingCtaLink>
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
        <li>{ctaHint1}</li>
        <li className="hidden sm:list-item" aria-hidden>
          ·
        </li>
        <li>{ctaHint2}</li>
      </ul>
    </>
  );
}
