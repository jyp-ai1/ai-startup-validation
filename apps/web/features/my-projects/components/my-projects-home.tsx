'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';

import type { StartupProject } from '@repo/types/validation';
import { Button } from '@repo/ui';

import { buildProjectCanvasUrl } from '@/lib/auth/journey-routes';

import { REVIEW_TYPES } from '@/features/interview/types/interview-state';

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
const DESCRIPTION_MAX = 1000;

function ProjectDescriptionField({ disabled }: { disabled: boolean }) {
  const t = useTranslations('myProjects');
  const [value, setValue] = useState('');
  return (
    <div className="space-y-1.5">
      <textarea
        id="project-description"
        name="description"
        rows={6}
        maxLength={DESCRIPTION_MAX}
        value={value}
        onChange={(event) => setValue(event.target.value.slice(0, DESCRIPTION_MAX))}
        placeholder={t('descriptionPlaceholder')}
        className="min-h-[9rem] w-full resize-y rounded-xl border border-border/70 bg-background px-4 py-3 text-sm leading-relaxed outline-none ring-primary/30 focus:ring-2"
        disabled={disabled}
      />
      <p className="text-right text-xs text-muted-foreground">
        {value.length}/{DESCRIPTION_MAX}
      </p>
    </div>
  );
}

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

      <div className="rounded-2xl border border-border/70 bg-card p-5">
        <form action={formAction} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="new-project-title" className="text-sm font-medium">
              {t('newProjectLabel')}
            </label>
            <input
              id="new-project-title"
              name="title"
              type="text"
              required
              minLength={2}
              maxLength={80}
              placeholder={t('newProjectPlaceholder')}
              className="h-11 w-full rounded-xl border border-border/70 bg-background px-4 text-sm outline-none ring-primary/30 focus:ring-2"
              disabled={!dbReady || pending}
            />
          </div>

          <fieldset className="space-y-3" disabled={!dbReady || pending}>
            <legend className="text-sm font-medium">{t('reviewTypeLabel')}</legend>
            <div className="space-y-2">
              {REVIEW_TYPES.map((type) => (
                <label
                  key={type}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 px-4 py-3 text-sm transition-colors has-[:checked]:border-primary/50 has-[:checked]:bg-primary/5"
                >
                  <input
                    type="radio"
                    name="reviewType"
                    value={type}
                    required
                    className="size-4 accent-primary"
                  />
                  <span>{t(`reviewTypes.${type}`)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <label htmlFor="project-description" className="text-sm font-medium">
              {t('descriptionLabel')}
            </label>
            <ProjectDescriptionField disabled={!dbReady || pending} />
          </div>

          <Button type="submit" disabled={!dbReady || pending} className="h-11 w-full gap-1">
            <Plus className="size-4" aria-hidden />
            {t('newProjectCta')}
          </Button>

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
                  href={buildProjectCanvasUrl(project.id)}
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
