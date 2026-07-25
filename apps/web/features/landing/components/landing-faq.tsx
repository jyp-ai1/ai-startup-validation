'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { cn } from '@repo/ui/lib/utils';

const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11'] as const;

export function LandingFaq() {
  const t = useTranslations('landing.faq');
  const { trackEvent } = useAnalytics();
  const [openId, setOpenId] = useState<string | null>('q1');

  function toggle(id: string) {
    const next = openId === id ? null : id;
    setOpenId(next);
    if (next) {
      trackEvent(ANALYTICS_EVENTS.faqExpand, { faq_id: id, screen: '/' });
    }
  }

  return (
    <section id="faq" className="border-t border-border/60 bg-muted/20 py-16 sm:py-20">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t('title')}
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">{t('desc')}</p>
        </div>

        <div className="mx-auto mt-10 max-w-3xl divide-y divide-border/60 rounded-2xl border border-border/70 bg-card px-2 shadow-sm">
          {FAQ_KEYS.map((key) => {
            const isOpen = openId === key;
            return (
              <div key={key}>
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-medium text-foreground">{t(`${key}.question`)}</span>
                  <ChevronDown
                    className={cn(
                      'size-5 shrink-0 text-muted-foreground transition-transform',
                      isOpen && 'rotate-180',
                    )}
                  />
                </button>
                {isOpen ? (
                  <div className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">
                    {t(`${key}.answer`)}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
