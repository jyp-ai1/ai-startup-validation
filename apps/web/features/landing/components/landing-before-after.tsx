import { getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';

export async function LandingBeforeAfter() {
  const t = await getTranslations('landing.beforeAfter');

  return (
    <section className="border-t border-border/60 bg-muted/20 py-16 sm:py-20">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{t('desc')}</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 md:gap-6">
          <div className="rounded-2xl border border-border/70 bg-card p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {t('beforeLabel')}
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground" role="list">
              {(t.raw('beforeItems') as string[]).map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden>✕</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border-2 border-primary/30 bg-primary/[0.04] p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">{t('afterLabel')}</p>
            <ul className="mt-4 space-y-2 text-sm text-foreground" role="list">
              {(t.raw('afterItems') as string[]).map((item) => (
                <li key={item} className="flex gap-2">
                  <ArrowRight className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
