'use client';

import { Brain, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

type GoalIntakePanelProps = {
  className?: string;
};

export function GoalIntakePanel({ className }: GoalIntakePanelProps) {
  const t = useTranslations('workflow.goal.intake');

  return (
    <div
      className={cn(
        'rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.06] to-background p-5 sm:p-6',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Brain className="size-5" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-medium text-primary">{t('eyebrow')}</p>
          <p className="mt-1 text-base font-semibold leading-relaxed text-foreground">{t('prompt')}</p>
        </div>
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-xl bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
        <MessageCircle className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <p>{t('hint')}</p>
      </div>
    </div>
  );
}
