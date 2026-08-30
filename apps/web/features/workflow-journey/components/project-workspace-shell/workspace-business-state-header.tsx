'use client';

import { useTranslations } from 'next-intl';

import type { WorkspaceBusinessState } from '../../lib/business-understanding/build-ai-pm-business-clarity';
import { cn } from '@repo/ui/lib/utils';

type WorkspaceBusinessStateHeaderProps = {
  projectName: string;
  state: WorkspaceBusinessState;
  className?: string;
};

/** P0-1 — project name only; full seed text in collapsible. */
export function WorkspaceBusinessStateHeader({
  projectName,
  state,
  className,
}: WorkspaceBusinessStateHeaderProps) {
  const t = useTranslations('workflow.journey.workspaceShell.conversationUx');
  const seedText =
    state.clarity?.initialSummary?.trim() ||
    state.headline?.trim() ||
    state.headlineLines.join('\n').trim();

  return (
    <section
      className={cn(
        'shrink-0 border-b border-border/60 bg-background px-4 py-3 sm:px-6 lg:px-8',
        className,
      )}
      aria-label={projectName}
    >
      <h1 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
        {projectName}
      </h1>
      {seedText ? (
        <details className="mt-2" data-testid="business-seed-details">
          <summary className="cursor-pointer text-xs font-medium text-primary">
            {t('seedToggle')}
          </summary>
          <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {seedText}
          </p>
        </details>
      ) : null}
    </section>
  );
}
