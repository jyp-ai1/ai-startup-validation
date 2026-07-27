'use client';

import { ArrowRight } from 'lucide-react';

import { LandingCtaLink } from './landing-cta-link';

type LandingHeroActionsProps = {
  ctaStart: string;
  ctaDemo: string;
  ctaHint1: string;
  ctaHint2: string;
};

export function LandingHeroActions({ ctaStart, ctaDemo, ctaHint1, ctaHint2 }: LandingHeroActionsProps) {
  return (
    <>
      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <LandingCtaLink
          href="/auth/login?next=/workspace"
          event="cta_start"
          className="inline-flex h-11 w-full min-w-[200px] items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:w-auto"
        >
          {ctaStart}
          <ArrowRight className="size-4" aria-hidden />
        </LandingCtaLink>
        <LandingCtaLink
          href="/validation?demo=guided"
          event="cta_demo"
          variant="outline"
          size="default"
          className="inline-flex h-11 w-full min-w-[200px] items-center justify-center rounded-lg sm:w-auto"
        >
          {ctaDemo}
        </LandingCtaLink>
      </div>
      <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
        <li>{ctaHint1}</li>
        <li className="hidden sm:list-item" aria-hidden>
          ·
        </li>
        <li>{ctaHint2}</li>
      </ul>
    </>
  );
}
