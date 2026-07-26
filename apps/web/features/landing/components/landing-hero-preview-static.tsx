import { getTranslations } from 'next-intl/server';
import { ArrowDown, Check } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

type LandingHeroPreviewStaticProps = {
  className?: string;
};

const FLOW_STEPS = ['viability', 'market', 'competition', 'pricing'] as const;

/** Server-rendered hero preview — validation flow (zero client JS for LCP). */
export async function LandingHeroPreviewStatic({ className }: LandingHeroPreviewStaticProps) {
  const t = await getTranslations('landing.hero.flowPreview');

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[20px] border border-border/70 bg-card p-6 shadow-xl md:p-8',
        className,
      )}
      aria-hidden
    >
      <ul className="space-y-3" role="list">
        {FLOW_STEPS.map((step) => (
          <li key={step} className="flex items-center gap-3 text-base font-medium md:text-lg">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Check className="size-4" aria-hidden />
            </span>
            {t(`steps.${step}`)}
          </li>
        ))}
      </ul>
      <div className="my-5 flex justify-center text-muted-foreground">
        <ArrowDown className="size-5" aria-hidden />
      </div>
      <div className="rounded-xl border border-border/70 bg-muted/40 px-4 py-4 text-center">
        <p className="text-2xl font-bold tracking-tight md:text-3xl">{t('outcome')}</p>
      </div>
    </div>
  );
}
