'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, Sparkles, Star } from 'lucide-react';

import { useDialogA11y } from '@/hooks/use-dialog-a11y';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { WorkflowGoalId } from '../types';
import { GoProjectGrowth } from './go-project-growth';

const AI_RECOMMENDATIONS: {
  goalId: WorkflowGoalId;
  labelKey: string;
  descKey: string;
  primary?: boolean;
}[] = [
  { goalId: 'mvp-development', labelKey: 'mvp', descKey: 'mvpDesc', primary: true },
  { goalId: 'investment-prep', labelKey: 'prd', descKey: 'prdDesc' },
  { goalId: 'new-business', labelKey: 'grant', descKey: 'grantDesc' },
  { goalId: 'investment-prep', labelKey: 'investor', descKey: 'investorDesc' },
];

type GoCelebrationOverlayProps = {
  open: boolean;
  onDismiss: () => void;
  className?: string;
};

export function GoCelebrationOverlay({ open, onDismiss, className }: GoCelebrationOverlayProps) {
  const t = useTranslations('workflow.goCelebration');
  const panelRef = useDialogA11y({ open, onDismiss });

  if (!open) return null;

  const primary = AI_RECOMMENDATIONS.find((r) => r.primary) ?? AI_RECOMMENDATIONS[0]!;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[60] flex items-center justify-center bg-background/90 p-4 backdrop-blur-md',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300',
        className,
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="go-celebration-title"
    >
      <div
        ref={panelRef}
        className={cn(
          'go-celebration-panel w-full max-w-lg rounded-3xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-card p-6 shadow-2xl dark:border-emerald-900 dark:from-emerald-950/40 sm:p-8',
        )}
      >
        <p className="text-center text-4xl" aria-hidden>
          🎉
        </p>
        <h2 id="go-celebration-title" className="mt-4 text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t('title')}
        </h2>
        <p className="mt-3 text-center text-base leading-relaxed text-muted-foreground">{t('subtitle')}</p>

        <GoProjectGrowth className="mt-6" />

        <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/[0.04] px-4 py-3 text-sm leading-relaxed text-foreground">
          <p className="flex items-center gap-2 font-medium text-primary">
            <Sparkles className="size-4" aria-hidden />
            {t('aiRecommendTitle')}
          </p>
          <p className="mt-1 text-muted-foreground">{t('aiRecommendDesc')}</p>
        </div>

        <div className="mt-5 rounded-2xl border-2 border-primary/40 bg-primary/[0.06] p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            <Star className="size-3 fill-primary" aria-hidden />
            {t('primaryLabel')}
          </p>
          <p className="mt-2 text-lg font-semibold text-foreground">{t(`stack.${primary.labelKey}`)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t(`stack.${primary.descKey}`)}</p>
          <Button asChild size="lg" className="mt-4 w-full rounded-xl">
            <Link href="/execution">{t('startPrimary')}</Link>
          </Button>
        </div>

        <ul className="mt-4 space-y-2" role="list">
          {AI_RECOMMENDATIONS.filter((r) => !r.primary).map((item, index) => (
            <li
              key={`${item.labelKey}-${index}`}
              className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500"
              style={{ animationDelay: `${120 + index * 80}ms` }}
            >
              <Link
                href="/execution"
                className="group flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="flex-1">
                  <span className="block font-medium text-foreground">{t(`stack.${item.labelKey}`)}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{t(`stack.${item.descKey}`)}</span>
                </span>
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>

        <Button type="button" variant="outline" className="mt-6 w-full rounded-xl" onClick={onDismiss}>
          {t('continue')}
        </Button>
      </div>
    </div>
  );
}
