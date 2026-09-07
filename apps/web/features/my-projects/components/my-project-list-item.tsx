'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Archive, MoreHorizontal, Pencil, RotateCcw, Trash2 } from 'lucide-react';

import type { StartupProject } from '@repo/types/validation';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui';

import { buildProjectCanvasUrl } from '@/lib/auth/journey-routes';

import {
  archiveMyProjectAction,
  deleteMyProjectAction,
  renameMyProjectAction,
  unarchiveMyProjectAction,
} from '../actions/my-project-actions';
import { formatRecentActivity, projectStatusLabel } from '../lib/my-project-utils';

type MyProjectListItemProps = {
  project: StartupProject;
  variant?: 'active' | 'archived';
};

export function MyProjectListItem({ project, variant = 'active' }: MyProjectListItemProps) {
  const t = useTranslations('myProjects');
  const ta = useTranslations('myProjects.lifecycle');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState(project.title);
  const [menuError, setMenuError] = useState<string | null>(null);

  const summaryPreview = project.summary?.trim().slice(0, 48) || project.title;

  function run(action: () => Promise<{ error?: string } | void>) {
    setMenuError(null);
    startTransition(async () => {
      const result = await action();
      if (result && 'error' in result && result.error) {
        setMenuError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="flex items-start gap-2 px-5 py-4" data-testid={`project-list-item-${project.id}`}>
      <div className="min-w-0 flex-1">
        <Link
          href={buildProjectCanvasUrl(project.id)}
          className="block transition-colors hover:text-primary"
        >
          <p className="font-semibold">{project.title}</p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{summaryPreview}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('lastEdited', {
              when: formatRecentActivity(project.lastActivityAt ?? project.updatedAt),
            })}
            {' · '}
            {projectStatusLabel(project.status)}
          </p>
        </Link>
      </div>

      <Link href={buildProjectCanvasUrl(project.id)}>
        <Button variant="outline" size="sm" className="shrink-0">
          {ta('open')}
        </Button>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 shrink-0"
            disabled={pending}
            aria-label={ta('menuLabel')}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => setRenameOpen(true)}>
            <Pencil className="size-4" />
            {ta('rename')}
          </DropdownMenuItem>
          {variant === 'archived' ? (
            <DropdownMenuItem
              onClick={() => run(async () => unarchiveMyProjectAction(project.id))}
            >
              <RotateCcw className="size-4" />
              {ta('restore')}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => run(async () => archiveMyProjectAction(project.id))}
            >
              <Archive className="size-4" />
              {ta('archive')}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            {ta('delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {menuError ? (
        <p className="sr-only" role="alert">
          {menuError}
        </p>
      ) : null}

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ta('renameTitle')}</DialogTitle>
          </DialogHeader>
          <input
            className="h-11 w-full rounded-xl border border-border/70 bg-background px-4 text-sm outline-none ring-primary/30 focus:ring-2"
            value={renameTitle}
            onChange={(event) => setRenameTitle(event.target.value)}
            maxLength={80}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              {ta('cancel')}
            </Button>
            <Button
              disabled={renameTitle.trim().length < 2 || pending}
              onClick={() =>
                run(async () => {
                  const result = await renameMyProjectAction(project.id, renameTitle.trim());
                  if (!result.error) setRenameOpen(false);
                  return result;
                })
              }
            >
              {ta('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ta('deleteTitle')}</DialogTitle>
            <DialogDescription>{ta('deleteBody')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {ta('cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const result = await deleteMyProjectAction(project.id);
                  if (!result.error) setDeleteOpen(false);
                  return result;
                })
              }
            >
              {ta('confirmDelete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}
