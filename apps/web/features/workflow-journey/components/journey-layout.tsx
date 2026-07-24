'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';

import { LocaleSwitcher } from '@/components/locale-switcher';
import { cn } from '@repo/ui/lib/utils';

type JourneyPhase = 'goal' | 'workflow' | 'workspace';

type JourneyLayoutProps = {
  phase: JourneyPhase;
  width?: 'default' | 'wide';
  variant?: 'journey' | 'intelligence';
  navSlot?: React.ReactNode;
  children: React.ReactNode;
};

const PHASES: JourneyPhase[] = ['goal', 'workflow', 'workspace'];

export function JourneyLayout({
  phase,
  children,
  width = 'default',
  variant = 'journey',
  navSlot,
}: JourneyLayoutProps) {
  const t = useTranslations('workflow.journey');
  const showJourneyPhases = variant === 'journey';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/95 backdrop-blur">
        <div
          className={cn(
            'mx-auto flex h-14 items-center justify-between px-4 sm:px-6',
            width === 'wide' ? 'max-w-6xl' : 'max-w-3xl',
          )}
        >
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="size-4" aria-hidden />
            </span>
            LaunchLens
          </Link>
          <LocaleSwitcher />
        </div>
        {showJourneyPhases ? (
          <nav
            className={cn(
              'mx-auto flex gap-1 px-4 pb-3 sm:px-6',
              width === 'wide' ? 'max-w-6xl' : 'max-w-3xl',
            )}
            aria-label={t('progressLabel')}
          >
            {PHASES.map((step, index) => {
              const active = step === phase;
              const done = PHASES.indexOf(phase) > index;
              return (
                <div
                  key={step}
                  className={cn('flex flex-1 flex-col gap-1', index < PHASES.length - 1 && 'pr-1')}
                >
                  <div
                    className={cn('h-1 rounded-full', active || done ? 'bg-primary' : 'bg-muted')}
                  />
                  <span
                    className={cn(
                      'text-[10px] font-medium uppercase tracking-wide sm:text-xs',
                      active ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {t(`phases.${step}`)}
                  </span>
                </div>
              );
            })}
          </nav>
        ) : navSlot ? (
          <div
            className={cn(
              'mx-auto px-4 pb-3 sm:px-6',
              width === 'wide' ? 'max-w-6xl' : 'max-w-3xl',
            )}
          >
            {navSlot}
          </div>
        ) : null}
      </header>
      <main
        className={cn(
          'journey-fade-in mx-auto px-4 py-8 sm:px-6 sm:py-12',
          width === 'wide' ? 'max-w-6xl 2xl:max-w-7xl' : 'max-w-3xl lg:max-w-4xl',
        )}
      >
        {children}
      </main>
    </div>
  );
}
