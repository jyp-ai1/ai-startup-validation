import { getTranslations } from 'next-intl/server';

export async function LandingTestimonials() {
  const t = await getTranslations('landing.testimonials');

  const items = ['one', 'two', 'three'] as const;

  return (
    <section id="stories" className="border-t border-border/60 bg-muted/20 py-16 sm:py-20">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{t('desc')}</p>
        </div>
        <ul className="mt-10 grid gap-4 md:grid-cols-3" role="list">
          {items.map((key) => (
            <li
              key={key}
              className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
            >
              <p className="text-sm leading-relaxed text-foreground">&ldquo;{t(`items.${key}.quote`)}&rdquo;</p>
              <p className="mt-4 text-xs font-medium text-muted-foreground">{t(`items.${key}.role`)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
