'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';

const SEGMENTS = [
  'startup',
  'enterprise',
  'innovation',
  'strategy',
  'pm',
  'consultant',
  'vc',
  'government',
] as const;

export function LandingBuiltFor() {
  const t = useTranslations('landing.builtFor');
  const { trackEvent } = useAnalytics();
  const sectionRef = useRef<HTMLElement>(null);
  const tracked = useRef(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !tracked.current) {
          tracked.current = true;
          trackEvent(ANALYTICS_EVENTS.builtforView, { screen: '/' });
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [trackEvent]);

  return (
    <section id="built-for" ref={sectionRef} className="border-y border-black/[0.04] bg-zinc-50/80 py-[100px]">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">{t('title')}</h2>
          <p className="mt-4 text-[15px] text-zinc-600">{t('desc')}</p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
          {SEGMENTS.map((key) => (
            <div
              key={key}
              className="flex min-h-[88px] items-center justify-center rounded-2xl border border-black/[0.06] bg-white px-3 py-5 text-center text-sm font-semibold text-zinc-800 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]"
            >
              {t(key)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
