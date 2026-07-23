'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { cn } from '@repo/ui/lib/utils';

const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'] as const;

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
    <section id="faq" className="border-t border-black/[0.05] bg-zinc-50/60 py-[120px]">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-4 text-[15px] text-zinc-600">{t('desc')}</p>
        </div>

        <div className="mx-auto mt-14 max-w-3xl divide-y divide-black/[0.06] rounded-[20px] border border-black/[0.06] bg-white px-2 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
          {FAQ_KEYS.map((key) => {
            const isOpen = openId === key;
            return (
              <div key={key}>
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-medium text-zinc-900">{t(`${key}.question`)}</span>
                  <ChevronDown
                    className={cn(
                      'size-5 shrink-0 text-zinc-400 transition-transform',
                      isOpen && 'rotate-180',
                    )}
                  />
                </button>
                {isOpen ? (
                  <div className="px-5 pb-5 text-sm leading-relaxed text-zinc-600">
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
