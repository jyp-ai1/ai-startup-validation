import { getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

type LandingHeroPreviewStaticProps = {
  className?: string;
};

/** Server-rendered hero preview — Morning Brief workspace card (zero client JS for LCP). */
export async function LandingHeroPreviewStatic({ className }: LandingHeroPreviewStaticProps) {
  const t = await getTranslations('landing.workspacePreview.morningBrief');

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[20px] border-2 border-primary/25 bg-gradient-to-br from-primary/[0.06] to-card shadow-xl',
        className,
      )}
      aria-hidden
    >
      <div className="border-b border-border/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="size-2.5 rounded-full bg-red-400/80" />
          <div className="size-2.5 rounded-full bg-amber-400/80" />
          <div className="size-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-2 text-xs text-muted-foreground">{t('windowTitle')}</span>
        </div>
      </div>
      <div className="space-y-4 p-5 md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
          {t('label')}
        </p>
        <div className="space-y-2 text-sm leading-relaxed">
          <p className="font-medium">{t('greeting')}</p>
          <p className="text-muted-foreground">{t('body')}</p>
        </div>
        <div className="flex items-end gap-3 border-t border-border/60 pt-4">
          <p className="text-3xl font-bold tabular-nums">72%</p>
          <ArrowRight className="mb-2 size-5 text-muted-foreground" aria-hidden />
          <p className="text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            76%
          </p>
        </div>
        <p className="text-xs text-muted-foreground">{t('eta')}</p>
        <div className="rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground">
          {t('cta')}
        </div>
      </div>
    </div>
  );
}
