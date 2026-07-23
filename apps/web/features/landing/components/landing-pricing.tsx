'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Rocket, Star } from 'lucide-react';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { LandingCtaLink } from './landing-cta-link';

const PLANS = ['free', 'pro', 'enterprise'] as const;
const PLAN_FEATURES: Record<(typeof PLANS)[number], string[]> = {
  free: ['f1', 'f2', 'f3', 'f4', 'f5'],
  pro: ['f1', 'f2', 'f3', 'f4'],
  enterprise: ['f1', 'f2', 'f3', 'f4'],
};

const BETA_BENEFITS = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7'] as const;

export function LandingPricing() {
  const t = useTranslations('landing.pricing');
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
          trackEvent(ANALYTICS_EVENTS.pricingView, { screen: '/' });
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [trackEvent]);

  return (
    <section id="pricing" ref={sectionRef} className="py-[120px]">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-1.5 text-xs font-semibold text-zinc-700">
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
            {t('betaBadge')}
          </div>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">{t('title')}</h2>
          <p className="mt-4 text-[15px] text-zinc-600">{t('desc')}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm font-medium text-zinc-700">
            <span>{t('betaStats')}</span>
            <span className="text-zinc-300">·</span>
            <span className="text-emerald-700">{t('betaFree')}</span>
          </div>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const highlighted = plan === 'free';
            const featureKeys = PLAN_FEATURES[plan];

            return (
              <article
                key={plan}
                className={cn(
                  'relative flex flex-col rounded-[20px] border p-8',
                  highlighted
                    ? 'border-zinc-900 bg-zinc-900 text-white shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)]'
                    : 'border-black/[0.06] bg-white shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]',
                )}
              >
                {highlighted ? (
                  <span className="absolute -top-3 left-6 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-zinc-900">
                    {t('recommended')}
                  </span>
                ) : null}
                <h3 className="text-xl font-semibold">{t(`${plan}.name`)}</h3>
                <p className={cn('mt-2 text-3xl font-bold', !highlighted && 'text-zinc-900')}>
                  {t(`${plan}.price`)}
                </p>
                <p className={cn('mt-2 text-sm', highlighted ? 'text-zinc-300' : 'text-zinc-600')}>
                  {t(`${plan}.desc`)}
                </p>
                <ul className="mt-8 flex-1 space-y-3">
                  {featureKeys.map((featureKey) => (
                    <li key={featureKey} className="flex items-start gap-2 text-sm">
                      <Check
                        className={cn(
                          'mt-0.5 size-4 shrink-0',
                          highlighted ? 'text-emerald-400' : 'text-emerald-600',
                        )}
                      />
                      {t(`${plan}.${featureKey}` as 'free.f1')}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  {plan === 'free' ? (
                    <LandingCtaLink
                      href="/dashboard"
                      event="cta_start"
                      className={cn(
                        'h-11 w-full rounded-xl',
                        highlighted
                          ? 'bg-white text-zinc-900 hover:bg-zinc-100'
                          : 'bg-zinc-900 text-white hover:bg-zinc-800',
                      )}
                    >
                      {t('free.cta')}
                    </LandingCtaLink>
                  ) : plan === 'enterprise' ? (
                    <Button variant="outline" className="h-11 w-full rounded-xl border-zinc-200" disabled>
                      {t('enterprise.cta')}
                    </Button>
                  ) : (
                    <Button variant="outline" className="h-11 w-full rounded-xl border-zinc-200" disabled>
                      {t('pro.cta')}
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <div className="mx-auto mt-16 max-w-3xl rounded-[24px] border border-black/[0.06] bg-zinc-50 p-8 md:p-10">
          <h3 className="text-lg font-semibold text-zinc-900">{t('betaBenefitsTitle')}</h3>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {BETA_BENEFITS.map((key) => (
              <li key={key} className="flex items-start gap-2 text-sm text-zinc-700">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                {t(key)}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-col items-center rounded-2xl bg-white px-6 py-8 text-center shadow-sm">
            <Rocket className="size-8 text-zinc-900" />
            <p className="mt-4 text-xl font-semibold leading-snug text-zinc-900 md:text-2xl">{t('betaNotice')}</p>
            <p className="mt-2 text-sm text-zinc-600">{t('betaNoticeSub')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
