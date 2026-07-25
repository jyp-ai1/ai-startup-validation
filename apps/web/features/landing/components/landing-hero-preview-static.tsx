import { getTranslations } from 'next-intl/server';

import { cn } from '@repo/ui/lib/utils';

type LandingHeroPreviewStaticProps = {
  className?: string;
};

/** Server-rendered hero preview — zero client JS for LCP (Epic 4 perf). */
export async function LandingHeroPreviewStatic({ className }: LandingHeroPreviewStaticProps) {
  const t = await getTranslations('landing.preview');

  const modules = [
    { label: t('research'), width: '85%' },
    { label: t('competitor'), width: '40%' },
    { label: t('voc'), width: '20%' },
    { label: t('government'), width: '90%' },
  ];

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[20px] border border-border/60 bg-card/80 shadow-lg',
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
      <div className="space-y-5 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('verdictLabel')}
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">GO</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{t('score', { score: 84 })}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/50 px-4 py-3 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('confidence')}
            </p>
            <p className="text-2xl font-bold tabular-nums text-foreground">92%</p>
          </div>
        </div>
        <div className="space-y-2.5">
          {modules.map((mod) => (
            <div key={mod.label}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-muted-foreground">{mod.label}</span>
                <span className="font-medium tabular-nums">{mod.width}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary/80" style={{ width: mod.width }} />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">{t('nextAction')}</p>
          <p className="mt-1 text-sm font-medium">{t('nextActionText')}</p>
        </div>
      </div>
    </div>
  );
}
