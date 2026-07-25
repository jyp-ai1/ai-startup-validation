import { getTranslations } from 'next-intl/server';
import { Sparkles } from 'lucide-react';

export async function LandingAiPmSection() {
  const t = await getTranslations('landing.aiPm');

  return (
    <section id="ai-pm" className="py-16 sm:py-20">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-12">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="size-4" aria-hidden />
              {t('eyebrow')}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">{t('desc')}</p>
            <ul className="mt-6 space-y-3" role="list">
              {(['lead', 'decide', 'execute'] as const).map((key) => (
                <li key={key} className="rounded-xl border border-border/60 bg-card px-4 py-3">
                  <p className="font-medium text-foreground">{t(`points.${key}.title`)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t(`points.${key}.desc`)}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.08] to-background p-6 sm:p-8">
            <p className="text-sm leading-relaxed text-foreground/90">&ldquo;{t('quote')}&rdquo;</p>
            <p className="mt-4 text-xs font-medium text-muted-foreground">{t('quoteRole')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
