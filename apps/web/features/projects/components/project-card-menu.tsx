'use client';

import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  Archive,
  Copy,
  MoreHorizontal,
  Pin,
  PinOff,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useState, useTransition } from 'react';

import type { StartupProject } from '@repo/types/validation';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui';

import {
  archiveProject,
  deleteProject,
  duplicateProject,
  restoreProject,
  toggleProjectPin,
  unarchiveProject,
} from '../actions/project-actions';

type ProjectCardMenuProps = {
  project: StartupProject;
  onUndoDelete?: (projectId: string, title: string) => void;
};

export function ProjectCardMenu({ project, onUndoDelete }: ProjectCardMenuProps) {
  const t = useTranslations('projects.actions');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function run(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          disabled={pending}
          aria-label={t('menuLabel')}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() =>
            run(async () => {
              const result = await toggleProjectPin(project.id);
              if (!result.ok) throw new Error(result.error);
            })
          }
        >
          {project.isPinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
          {project.isPinned ? t('unpin') : t('pin')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            run(async () => {
              const result = await duplicateProject(project.id);
              if (!result.ok) throw new Error(result.error);
              router.push(`/projects/${result.projectId}`);
            })
          }
        >
          <Copy className="size-4" />
          {t('duplicate')}
        </DropdownMenuItem>
        {project.status === 'ARCHIVED' ? (
          <DropdownMenuItem
            onClick={() =>
              run(async () => {
                const result = await unarchiveProject(project.id);
                if (!result.ok) throw new Error(result.error);
              })
            }
          >
            <RotateCcw className="size-4" />
            {t('unarchive')}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={() =>
              run(async () => {
                const result = await archiveProject(project.id);
                if (!result.ok) throw new Error(result.error);
              })
            }
          >
            <Archive className="size-4" />
            {t('archive')}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() =>
            run(async () => {
              await deleteProject(project.id);
              onUndoDelete?.(project.id, project.title);
            })
          }
        >
          <Trash2 className="size-4" />
          {t('delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type ProjectUndoBannerProps = {
  projectId: string;
  title: string;
  onDismiss: () => void;
};

export function ProjectUndoBanner({ projectId, title, onDismiss }: ProjectUndoBannerProps) {
  const t = useTranslations('projects.actions');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-[120] flex w-[min(92vw,420px)] -translate-x-1/2 items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-lg"
    >
      <p className="truncate text-sm">
        {t('deletedToast', { title })}
      </p>
      <div className="flex shrink-0 gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await restoreProject(projectId);
              if (result.ok) {
                onDismiss();
                router.refresh();
              }
            })
          }
        >
          {t('undo')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          {t('dismiss')}
        </Button>
      </div>
    </div>
  );
}
