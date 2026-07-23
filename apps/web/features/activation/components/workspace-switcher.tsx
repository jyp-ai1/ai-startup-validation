'use client';

import { useTransition } from 'react';
import { ChevronDown, FlaskConical, FolderKanban } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  switchActiveProject,
  switchToDemoWorkspace,
  switchToPersonalWorkspace,
} from '@/features/activation/actions/workspace-actions';
import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

type WorkspaceProject = { id: string; title: string };

type WorkspaceSwitcherProps = {
  demoMode: boolean;
  isAuthenticated: boolean;
  activeProjectId?: string | null;
  userProjects: WorkspaceProject[];
  demoProjects: WorkspaceProject[];
  className?: string;
};

export function WorkspaceSwitcher({
  demoMode,
  isAuthenticated,
  activeProjectId,
  userProjects,
  demoProjects,
  className,
}: WorkspaceSwitcherProps) {
  const t = useTranslations('activation.workspace');
  const { trackEvent } = useAnalytics();
  const [pending, startTransition] = useTransition();

  const activeTitle =
    (demoMode ? demoProjects : userProjects).find((p) => p.id === activeProjectId)?.title ??
    (demoMode ? t('demoLabel') : t('myProjects'));

  function trackSwitch(mode: 'demo' | 'personal', projectId?: string) {
    trackEvent(ANALYTICS_EVENTS.workspaceSwitch, {
      screen: '/dashboard',
      mode,
      project_id: projectId,
    });
  }

  function run(action: () => Promise<void>, mode: 'demo' | 'personal', projectId?: string) {
    trackSwitch(mode, projectId);
    startTransition(() => {
      void action();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          className={cn(
            'h-9 max-w-[220px] justify-between gap-2 border-sidebar-border bg-sidebar-accent/40 px-3 text-sidebar-foreground',
            className,
          )}
        >
          <span className="truncate text-xs font-medium">{activeTitle}</span>
          <ChevronDown className="size-3.5 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">{t('title')}</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => run(switchToDemoWorkspace, 'demo', demoProjects[0]?.id)}
          className="gap-2"
        >
          <FlaskConical className="size-4" />
          <span>{t('demoLabel')}</span>
          {demoMode ? <span className="ml-auto text-[10px] text-primary">{t('active')}</span> : null}
        </DropdownMenuItem>
        {isAuthenticated ? (
          <DropdownMenuItem
            onClick={() => run(() => switchToPersonalWorkspace(userProjects[0]?.id), 'personal')}
            className="gap-2"
          >
            <FolderKanban className="size-4" />
            <span>{t('myProjects')}</span>
            {!demoMode ? <span className="ml-auto text-[10px] text-primary">{t('active')}</span> : null}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {demoMode ? t('recentDemo') : t('recentProjects')}
        </DropdownMenuLabel>
        {(demoMode ? demoProjects : userProjects).slice(0, 5).map((project) => (
          <DropdownMenuItem
            key={project.id}
            onClick={() =>
              run(
                () => switchActiveProject(project.id),
                demoMode ? 'demo' : 'personal',
                project.id,
              )
            }
            className="truncate"
          >
            {project.title}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
