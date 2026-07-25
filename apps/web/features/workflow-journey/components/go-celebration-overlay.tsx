'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, Sparkles } from 'lucide-react';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { WorkflowGoalId } from '../types';

const WORKFLOW_STACK: { goalId: WorkflowGoalId; labelKey: string }[] = [
  { goalId: 'mvp-development', labelKey: 'mvp' },
  { goalId: 'investment-prep', labelKey: 'investor' },
  { goalId: 'new-business', labelKey: 'grant' },
];

type GoCelebrationOverlayProps = {
  open: boolean;
  onDismiss: () => void;
  className?: string;
};

export function GoCelebrationOverlay({ open, onDismiss, className }: GoCelebrationOverlayProps) {
  const t = useTranslations('workflow.goCelebration');

  if (!open) return null;

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
        className={cn(
          'go-celebration-panel w-full max-w-lg rounded-3xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-card p-6 shadow-2xl dark:border-emerald-900 dark:from-emerald-950/40 sm:p-8',
          'motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:slide-in-from-bottom-4 motion-safe:duration-500',
        )}
      >
        <p className="text-center text-4xl" aria-hidden>
          🎉
        </p>
        <h2 id="go-celebration-title" className="mt-4 text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t('title')}
        </h2>
        <p className="mt-3 text-center text-base leading-relaxed text-muted-foreground">{t('subtitle')}</p>

        <div className="mt-8 rounded-2xl border border-border/70 bg-background/80 p-4 sm:p-5">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="size-3.5" aria-hidden />
            {t('stackTitle')}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t('stackDesc')}</p>
          <ul className="mt-4 space-y-2" role="list">
            {WORKFLOW_STACK.map((item, index) => (
              <li
                key={item.goalId}
                className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500"
                style={{ animationDelay: `${120 + index * 80}ms` }}
              >
                <Link
                  href={`/goal?next=${item.goalId}`}
                  className="group flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <span
                    className="flex size-5 shrink-0 items-center justify-center rounded border border-muted-foreground/40 text-xs group-hover:border-primary group-hover:text-primary"
                    aria-hidden
                  >
                    □
                  </span>
                  <span className="flex-1 font-medium text-foreground">{t(`stack.${item.labelKey}`)}</span>
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <Button type="button" variant="outline" className="mt-6 w-full rounded-xl" onClick={onDismiss}>
          {t('continue')}
        </Button>
      </div>
    </div>
  );
}
