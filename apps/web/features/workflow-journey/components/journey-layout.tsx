'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { LocaleSwitcher } from '@/components/locale-switcher';
import { AlabomLogo } from '@/lib/brand/alabom-logo';
import { BRAND_CONFIG } from '@/lib/brand/brand-config';
import type { AppAuthUser } from '@/lib/auth/server-auth';
import { cn } from '@repo/ui/lib/utils';

import { JourneyGlobalNav } from './journey-global-nav';

type JourneyPhase = 'goal' | 'workflow' | 'workspace';

type JourneyLayoutProps = {
  phase: JourneyPhase;
  width?: 'default' | 'wide' | 'workspace';
  variant?: 'journey' | 'intelligence';
  navSlot?: React.ReactNode;
  versionLabel?: string;
  user?: AppAuthUser | null;
  children: React.ReactNode;
};

const WIDTH_CLASS = {
  default: 'max-w-3xl lg:max-w-4xl',
  wide: 'max-w-6xl 2xl:max-w-7xl',
  workspace: 'max-w-7xl',
} as const;

const HEADER_WIDTH_CLASS = {
  default: 'max-w-3xl',
  wide: 'max-w-6xl',
  workspace: 'max-w-7xl',
} as const;

const PHASES: JourneyPhase[] = ['goal', 'workflow', 'workspace'];

export function JourneyLayout({
  phase,
  children,
  width = 'default',
  variant = 'journey',
  navSlot,
  versionLabel,
  user = null,
}: JourneyLayoutProps) {
  const t = useTranslations('workflow.journey');
  const showJourneyPhases = variant === 'journey';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/95 backdrop-blur">
        <div
          className={cn(
            'mx-auto flex h-14 items-center justify-between px-4 sm:px-6',
            HEADER_WIDTH_CLASS[width],
          )}
        >
          <Link
            href="/"
            className="flex items-center"
            aria-label={BRAND_CONFIG.displayName}
          >
            <AlabomLogo withWordmark markClassName="size-8" className="gap-2 text-sm" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            {versionLabel ? (
              <span className="hidden text-[11px] font-medium text-muted-foreground sm:inline">
                {versionLabel}
              </span>
            ) : null}
            <JourneyGlobalNav user={user} />
            <LocaleSwitcher />
          </div>
        </div>
        {showJourneyPhases ? (
          <nav
            className={cn(
              'mx-auto flex gap-1 px-4 pb-3 sm:px-6',
              HEADER_WIDTH_CLASS[width],
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
              HEADER_WIDTH_CLASS[width],
            )}
          >
            {navSlot}
          </div>
        ) : null}
      </header>
      <main
        id="main-content"
        className={cn(
          'journey-fade-in mx-auto px-4 py-8 sm:px-6 sm:py-10',
          WIDTH_CLASS[width],
        )}
      >
        {children}
      </main>
    </div>
  );
}
