'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

type LoopPhase = 'thinking' | 'evidence' | 'decision' | 'memory';

type V2WorkspacePhilosophyBannerProps = {
  activePhase: LoopPhase;
  className?: string;
};

const PHASES: LoopPhase[] = ['thinking', 'evidence', 'decision', 'memory'];

export function V2WorkspacePhilosophyBanner({
  activePhase,
  className,
}: V2WorkspacePhilosophyBannerProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.ia.thinkingUx.philosophy');

  return (
    <header className={cn('space-y-2 border-b border-border/40 pb-4', className)}>
      <p className="text-base font-semibold tracking-tight">{t('tagline')}</p>
      <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
      <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <span>{t('accumulating')}</span>
        {PHASES.map((phase, i) => (
          <span key={phase} className="inline-flex items-center gap-1">
            <span
              className={cn(
                'font-medium',
                activePhase === phase ? 'text-primary' : 'text-foreground',
              )}
            >
              {t(`phases.${phase}`)}
            </span>
            {i < PHASES.length - 1 ? <span aria-hidden>→</span> : null}
          </span>
        ))}
      </p>
    </header>
  );
}
