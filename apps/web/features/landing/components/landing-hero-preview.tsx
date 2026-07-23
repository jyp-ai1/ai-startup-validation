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
        'overflow-hidden rounded-[20px] border border-black/[0.06] bg-white/70 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] backdrop-blur-sm',
        variant === 'demo' && 'shadow-[0_16px_60px_-20px_rgba(0,0,0,0.12)]',
        className,
      )}
    >
      <div className="border-b border-black/[0.05] px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="size-2.5 rounded-full bg-red-400/80" />
          <div className="size-2.5 rounded-full bg-amber-400/80" />
          <div className="size-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-2 text-xs text-zinc-400">{t('windowTitle')}</span>
        </div>
      </div>

      <div className="space-y-5 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              {t('verdictLabel')}
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-emerald-600">GO</p>
            <p className="mt-0.5 text-sm text-zinc-500">{t('score', { score: 84 })}</p>
          </div>
          <div className="rounded-2xl border border-black/[0.05] bg-zinc-50/80 px-4 py-3 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              {t('confidence')}
            </p>
            <p className="text-2xl font-bold tabular-nums text-zinc-900">92%</p>
          </div>
        </div>

        <div className="space-y-2.5">
          {modules.map((mod) => (
            <div key={mod.label}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-medium text-zinc-700">{mod.label}</span>
                <span className="tabular-nums text-zinc-500">{mod.value}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-zinc-900 transition-all duration-700"
                  style={{ width: mod.width }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-zinc-900/10 bg-zinc-900/[0.03] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            {t('nextAction')}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
            {t('nextActionText')}
            <ArrowRight className="size-3.5" />
          </p>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-black/[0.05] bg-white px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <CheckCircle2 className="size-4 text-emerald-600" />
            {t('evidence')}
          </div>
          <span className="text-lg font-bold tabular-nums text-zinc-900">146</span>
        </div>
      </div>
    </div>
  );
}
