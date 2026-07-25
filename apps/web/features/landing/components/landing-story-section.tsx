import { getTranslations } from 'next-intl/server';

export async function LandingStorySection() {
  const t = await getTranslations('landing.story');

  const steps = ['problem', 'shift', 'outcome'] as const;

  return (
    <section className="border-y border-border/60 bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">{t('desc')}</p>
        </div>
        <ol className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-3" role="list">
          {steps.map((key, index) => (
            <li key={key} className="relative rounded-2xl border border-border/60 bg-card p-5">
              <span className="text-xs font-bold tabular-nums text-primary">{String(index + 1).padStart(2, '0')}</span>
              <p className="mt-2 font-semibold text-foreground">{t(`steps.${key}.title`)}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`steps.${key}.desc`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
