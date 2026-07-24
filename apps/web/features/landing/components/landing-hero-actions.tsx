'use client';

import { ArrowRight, Play } from 'lucide-react';

import { LandingCtaLink } from './landing-cta-link';

type LandingHeroActionsProps = {
  ctaStart: string;
  ctaDemo: string;
  ctaHint1: string;
  ctaHint2: string;
  ctaHint3: string;
};

export function LandingHeroActions({
  ctaStart,
  ctaDemo,
  ctaHint1,
  ctaHint2,
  ctaHint3,
}: LandingHeroActionsProps) {
  return (
    <>
      <div className="mt-10 flex flex-wrap gap-3">
        <LandingCtaLink
          href="/goal"
          event="cta_start"
          className="h-11 rounded-xl bg-primary px-5 text-primary-foreground hover:bg-primary/90 sm:h-12 sm:px-8"
        >
          {ctaStart}
          <ArrowRight className="size-4" aria-hidden />
        </LandingCtaLink>
        <LandingCtaLink
          href="/demo/enter"
          event="cta_demo"
          variant="outline"
          className="h-11 rounded-xl border-border bg-background px-5 text-foreground hover:bg-muted sm:h-12 sm:px-8"
        >
          <Play className="size-4" aria-hidden />
          {ctaDemo}
        </LandingCtaLink>
      </div>
      <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-muted-foreground">
        <li>{ctaHint1}</li>
        <li className="hidden sm:list-item" aria-hidden>
          ·
        </li>
        <li>{ctaHint2}</li>
        <li className="hidden sm:list-item" aria-hidden>
          ·
        </li>
        <li className="font-medium text-emerald-700 dark:text-emerald-400">{ctaHint3}</li>
      </ul>
    </>
  );
}
