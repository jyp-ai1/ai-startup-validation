'use client';

import { useTranslations } from 'next-intl';

const STEPS = ['problem1', 'problem2', 'problem3', 'resolution'] as const;

export function LandingGtmWhyNarrative() {
  const t = useTranslations('landing.gtm.why');

  return (
    <section id="why-launchlens" className="border-y border-border/50 bg-muted/10 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t('title')}
        </h2>
        <ol className="mt-12 space-y-0" role="list">
          {STEPS.map((key, index) => (
            <li key={key} className="relative pb-10 last:pb-0">
              {index < STEPS.length - 1 ? (
                <span
                  className="absolute left-[11px] top-7 h-[calc(100%-1.25rem)] w-px bg-border"
                  aria-hidden
                />
              ) : null}
              <div className="flex gap-4">
                <span
                  className={
                    key === 'resolution'
                      ? 'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground'
                      : 'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-background text-xs font-medium text-muted-foreground'
                  }
                  aria-hidden
                >
                  {key === 'resolution' ? '→' : index + 1}
                </span>
                <p
                  className={
                    key === 'resolution'
                      ? 'text-base font-medium leading-relaxed text-foreground sm:text-lg'
                      : 'text-sm leading-relaxed text-muted-foreground sm:text-base'
                  }
                >
                  {t(key)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
