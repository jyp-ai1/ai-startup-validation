'use client';

import { ArrowRight } from 'lucide-react';

import { LandingCtaLink } from './landing-cta-link';

type LandingHeroActionsProps = {
  ctaStart: string;
  ctaHint1: string;
  ctaHint2: string;
  speedPromise: string;
  bullets: string[];
};

export function LandingHeroActions({
  ctaStart,
  ctaHint1,
  ctaHint2,
  speedPromise,
  bullets,
}: LandingHeroActionsProps) {
  return (
    <>
      <div className="mt-8">
        <LandingCtaLink
          href="/goal"
          event="cta_start"
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 sm:w-auto"
        >
          {ctaStart}
          <ArrowRight className="size-4" aria-hidden />
        </LandingCtaLink>
      </div>
      <ul className="mt-5 space-y-1.5" role="list">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-emerald-600 dark:text-emerald-400" aria-hidden>
              ✓
            </span>
            {bullet}
          </li>
        ))}
      </ul>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
        <li>{ctaHint1}</li>
        <li className="hidden sm:list-item" aria-hidden>
          ·
        </li>
        <li>{ctaHint2}</li>
      </ul>
      <p className="mt-4 text-sm font-medium text-primary">{speedPromise}</p>
    </>
  );
}
