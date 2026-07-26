'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import { WorkspaceJourneyGuide, type WorkspaceJourneyStepId } from './workspace-journey-guide';
import { WorkspaceShell } from './workspace-shell';

type FounderWorkspaceLayoutProps = {
  activeStep: WorkspaceJourneyStepId;
  center: React.ReactNode;
  right?: React.ReactNode;
  leftFooter?: React.ReactNode;
  embedded?: boolean;
  className?: string;
  stackAt?: 'md' | 'lg';
};

export function DecisionBoardPlaceholder({ className }: { className?: string }) {
  const t = useTranslations('workflow.founderAiPm.executiveDecisionBoard');

  return (
    <div
      className={cn(
        'flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/10 p-6 text-center text-sm text-muted-foreground',
        className,
      )}
    >
      {t('placeholder')}
    </div>
  );
}

/** One shell for Goal → Workflow → Workspace → Today — left workflow is always visible. */
export function FounderWorkspaceLayout({
  activeStep,
  center,
  right,
  leftFooter,
  embedded = false,
  className,
  stackAt,
}: FounderWorkspaceLayoutProps) {
  return (
    <WorkspaceShell
      embedded={embedded}
      className={className}
      stackAt={stackAt}
      left={
        <>
          <WorkspaceJourneyGuide activeStep={activeStep} />
          {leftFooter}
        </>
      }
      center={center}
      right={right}
    />
  );
}
