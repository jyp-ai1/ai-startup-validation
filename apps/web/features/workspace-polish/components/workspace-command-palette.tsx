'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
} from '@repo/ui';

import type { WorkspaceCommand, WorkspaceCommandId } from '../types';

type WorkspaceCommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string | null;
  onSearchOpen?: () => void;
};

const BASE_COMMANDS: WorkspaceCommandId[] = [
  'search',
  'open_dashboard',
  'open_project',
  'run_ai',
  'generate_decision',
  'export_report',
  'add_research',
];

export function WorkspaceCommandPalette({
  open,
  onOpenChange,
  projectId,
  onSearchOpen,
}: WorkspaceCommandPaletteProps) {
  const t = useTranslations('polish.command');
  const { trackEvent } = useAnalytics();

  const commands = useMemo(() => {
    return BASE_COMMANDS.map((id): WorkspaceCommand => {
      switch (id) {
        case 'open_project':
          return {
            id,
            labelKey: 'openProject',
            href: projectId ? `/projects/${projectId}` : '/projects',
            shortcut: projectId ? 'G P' : undefined,
          };
        case 'generate_decision':
          return {
            id,
            labelKey: 'generateDecision',
            href: projectId ? `/projects/${projectId}/decision` : undefined,
          };
        case 'run_ai':
          return { id, labelKey: 'runAi', href: projectId ? `/projects/${projectId}/agent` : undefined };
        case 'export_report':
          return {
            id,
            labelKey: 'exportReport',
            href: projectId ? `/projects/${projectId}/executive-report` : undefined,
          };
        case 'add_research':
          return {
            id,
            labelKey: 'addResearch',
            href: projectId ? `/projects/${projectId}/research/new` : undefined,
          };
        case 'open_dashboard':
          return { id, labelKey: 'openDashboard', href: '/dashboard', shortcut: 'G D' };
        case 'search':
          return { id, labelKey: 'search', action: 'search', shortcut: '⌘K' };
        default:
          return { id, labelKey: 'openDashboard' };
      }
    });
  }, [projectId]);

  function handleCommand(command: WorkspaceCommand) {
    trackEvent(ANALYTICS_EVENTS.workspaceCommand, {
      project_id: projectId ?? undefined,
      command_id: command.id,
    });
    onOpenChange(false);
    if (command.action === 'search') {
      onSearchOpen?.();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="text-sm font-semibold">{t('title')}</DialogTitle>
          <Input placeholder={t('filter')} className="mt-2" aria-label={t('filter')} />
        </DialogHeader>
        <ul className="max-h-72 overflow-y-auto p-2">
          {commands.map((command) => {
            const content = (
              <span className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted/60">
                <span>{t(command.labelKey as 'openProject')}</span>
                {command.shortcut ? (
                  <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {command.shortcut}
                  </kbd>
                ) : null}
              </span>
            );

            if (command.href && command.action !== 'search') {
              return (
                <li key={command.id}>
                  <Link href={command.href} onClick={() => handleCommand(command)}>
                    {content}
                  </Link>
                </li>
              );
            }

            return (
              <li key={command.id}>
                <button type="button" className="w-full text-left" onClick={() => handleCommand(command)}>
                  {content}
                </button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
