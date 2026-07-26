import { getTranslations } from 'next-intl/server';
import { ArrowRight, Star } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

import { LandingCtaLink } from './landing-cta-link';

type LandingWorkspacePreviewSectionProps = {
  className?: string;
};

export async function LandingWorkspacePreviewSection({
  className,
}: LandingWorkspacePreviewSectionProps) {
  const t = await getTranslations('landing.workspacePreview');
  const logEntries = ['one', 'two', 'three', 'four'] as const;

  return (
    <section
      className={cn('border-t border-border/60 bg-muted/15 py-16 sm:py-20', className)}
      aria-labelledby="workspace-preview-title"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="workspace-preview-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t('sectionTitle')}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t('sectionDesc')}
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border-2 border-primary/25 bg-gradient-to-br from-primary/[0.06] to-background p-6 shadow-lg lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
              {t('morningBrief.label')}
            </p>
            <div className="mt-4 space-y-3 text-sm leading-relaxed">
              <p className="font-medium">{t('morningBrief.greeting')}</p>
              <p className="text-muted-foreground">{t('morningBrief.body')}</p>
            </div>
            <div className="mt-5 flex items-end gap-3 border-t border-border/60 pt-5">
              <p className="text-3xl font-bold tabular-nums text-foreground">72%</p>
              <ArrowRight className="mb-2 size-5 text-muted-foreground" aria-hidden />
              <p className="text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                76%
              </p>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t('morningBrief.eta')}</p>
            <LandingCtaLink
              href="/goal"
              event="cta_start"
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {t('morningBrief.cta')}
              <ArrowRight className="size-4" aria-hidden />
            </LandingCtaLink>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('workLog.title')}
            </p>
            <ul className="mt-4 space-y-0 divide-y divide-border/50" role="list">
              {logEntries.map((key) => (
                <li key={key} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="w-11 shrink-0 text-sm tabular-nums text-muted-foreground">
                    {t(`workLog.entries.${key}.time`)}
                  </span>
                  <p className="text-sm leading-relaxed">{t(`workLog.entries.${key}.text`)}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('testimonial.label')}
            </p>
            <div className="mt-4 flex gap-0.5" aria-label={t('testimonial.ratingLabel')}>
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  className="size-4 fill-amber-400 text-amber-400"
                  aria-hidden
                />
              ))}
            </div>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground">
              &ldquo;{t('testimonial.quote')}&rdquo;
            </p>
            <p className="mt-4 text-xs font-medium text-muted-foreground">
              — {t('testimonial.role')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
