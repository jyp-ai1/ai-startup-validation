'use client';

import { useTranslations } from 'next-intl';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

type LandingHeroPreviewProps = {
  className?: string;
  variant?: 'hero' | 'demo';
};

export function LandingHeroPreview({ className, variant = 'hero' }: LandingHeroPreviewProps) {
  const t = useTranslations('landing.preview');

  const modules = [
    { label: t('research'), value: '85%', width: '85%' },
    { label: t('competitor'), value: '40%', width: '40%' },
    { label: t('voc'), value: '20%', width: '20%' },
    { label: t('government'), value: '90%', width: '90%' },
  ];

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[20px] border border-border/60 bg-card/80 shadow-lg backdrop-blur-sm',
        variant === 'demo' && 'shadow-xl',
        className,
      )}
    >
      <div className="border-b border-border/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="size-2.5 rounded-full bg-red-400/80" aria-hidden />
          <div className="size-2.5 rounded-full bg-amber-400/80" aria-hidden />
          <div className="size-2.5 rounded-full bg-emerald-400/80" aria-hidden />
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
                <span className="font-medium text-foreground">{mod.label}</span>
                <span className="tabular-nums text-muted-foreground">{mod.value}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{ width: mod.width }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('nextAction')}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            {t('nextActionText')}
            <ArrowRight className="size-3.5" aria-hidden />
          </p>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            {t('evidence')}
          </div>
          <span className="text-lg font-bold tabular-nums text-foreground">146</span>
        </div>
      </div>
    </div>
  );
}
