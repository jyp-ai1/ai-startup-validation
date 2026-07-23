'use client';

import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';

const ROADMAP_KEYS = ['beta', 'aiResearch', 'realAi', 'collaboration', 'enterprise', 'marketplace'] as const;

export function LandingRoadmap() {
  const t = useTranslations('landing.roadmap');
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
          trackEvent(ANALYTICS_EVENTS.roadmapView, { screen: '/' });
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [trackEvent]);

  return (
    <section id="roadmap" ref={sectionRef} className="py-[120px]">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">{t('year')}</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">{t('title')}</h2>
          <p className="mt-4 text-[15px] text-zinc-600">{t('desc')}</p>
        </div>

        <ol className="mx-auto mt-14 flex max-w-xl flex-col">
          {ROADMAP_KEYS.map((key, index) => {
            const isCurrent = key === 'beta';

            return (
              <li key={key} className="relative flex gap-4 pb-10 last:pb-0">
                {index < ROADMAP_KEYS.length - 1 ? (
                  <span className="absolute left-[15px] top-8 h-[calc(100%-1rem)] w-px bg-zinc-200" aria-hidden />
                ) : null}
                <span
                  className={
                    isCurrent
                      ? 'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white'
                      : 'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400'
                  }
                >
                  {isCurrent ? <Check className="size-4" /> : <span className="text-xs font-semibold">{index + 1}</span>}
                </span>
                <div className="pt-0.5">
                  <p className="text-base font-semibold text-zinc-900">{t(`${key}.title`)}</p>
                  <p className="mt-1 text-sm text-zinc-600">{t(`${key}.desc`)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
