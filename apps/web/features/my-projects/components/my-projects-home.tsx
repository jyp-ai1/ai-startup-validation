'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';

import type { StartupProject } from '@repo/types/validation';
import { Button } from '@repo/ui';

import {
  createMyProjectAction,
  type CreateMyProjectState,
} from '../actions/my-project-actions';
import {
  displayName,
  formatRecentActivity,
  projectStatusLabel,
} from '../lib/my-project-utils';

type MyProjectsHomeProps = {
  userName: string | null;
  userEmail: string;
  projects: StartupProject[];
  dbReady: boolean;
};

const INITIAL: CreateMyProjectState = {};

export function MyProjectsHome({ userName, userEmail, projects, dbReady }: MyProjectsHomeProps) {
  const t = useTranslations('myProjects');
  const [state, formAction, pending] = useActionState(createMyProjectAction, INITIAL);
  const greetingName = displayName(userName, userEmail);

  return (
    <div className="mx-auto max-w-lg space-y-8 py-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('greeting', { name: greetingName })}
        </h1>
        <p className="text-muted-foreground">{t('lead')}</p>
      </header>

      {!dbReady ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          {t('dbNotReady')}
        </p>
      ) : null}

      <div className="border-t border-border/60 pt-6">
        <form action={formAction} className="space-y-3">
          <label className="sr-only" htmlFor="new-project-title">
            {t('newProjectLabel')}
          </label>
          <div className="flex gap-2">
            <input
              id="new-project-title"
              name="title"
              type="text"
              required
              minLength={2}
              maxLength={80}
              placeholder={t('newProjectPlaceholder')}
              className="h-11 flex-1 rounded-xl border border-border/70 bg-background px-4 text-sm outline-none ring-primary/30 focus:ring-2"
              disabled={!dbReady || pending}
            />
            <Button type="submit" disabled={!dbReady || pending} className="h-11 shrink-0 gap-1">
              <Plus className="size-4" aria-hidden />
              {t('newProjectCta')}
            </Button>
          </div>
          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}
        </form>
      </div>

      {projects.length > 0 ? (
        <section className="space-y-0">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">{t('recentProjects')}</h2>
          <ul className="divide-y divide-border/60 rounded-2xl border border-border/70 bg-card">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/my-projects/${project.id}`}
                  className="block px-5 py-4 transition-colors hover:bg-muted/40"
                >
                  <p className="font-semibold">{project.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {projectStatusLabel(project.status)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground/80">
                    {t('lastEdited', {
                      when: formatRecentActivity(project.lastActivityAt ?? project.updatedAt),
                    })}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : dbReady ? (
        <p className="text-center text-sm text-muted-foreground">{t('emptyHint')}</p>
      ) : null}
    </div>
  );
}
