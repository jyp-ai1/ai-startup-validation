'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';

import type { StartupProject } from '@repo/types/validation';
import { Button } from '@repo/ui';

import { REVIEW_TYPES } from '@/features/interview/types/interview-state';

import {
  createMyProjectAction,
  type CreateMyProjectState,
} from '../actions/my-project-actions';
import { displayName } from '../lib/my-project-utils';
import { MyProjectListItem } from './my-project-list-item';
import {
  ProjectIntakeDocumentField,
  type ProjectIntakeUploadStatus,
} from './project-intake-document-field';
import { ProjectDescriptionField } from './project-description-field';

type MyProjectsHomeProps = {
  userName: string | null;
  userEmail: string;
  projects: StartupProject[];
  archivedProjects: StartupProject[];
  dbReady: boolean;
};

const INITIAL: CreateMyProjectState = {};

export function MyProjectsHome({
  userName,
  userEmail,
  projects,
  archivedProjects,
  dbReady,
}: MyProjectsHomeProps) {
  const t = useTranslations('myProjects');
  const [state, formAction, pending] = useActionState(createMyProjectAction, INITIAL);
  const [uploadStatus, setUploadStatus] = useState<ProjectIntakeUploadStatus>('idle');
  const [showArchived, setShowArchived] = useState(false);
  const greetingName = displayName(userName, userEmail);
  const uploadBlocking = uploadStatus === 'loading';

  const recentPreview = projects.slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl space-y-8 py-4">
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
      <div className="rounded-2xl border border-border/70 bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold">새 프로젝트</h2>
        <form action={formAction} className="space-y-5" data-testid="my-projects-create-form">
          <div className="space-y-2">
            <label htmlFor="new-project-title" className="text-sm font-medium">
              프로젝트 제목
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
              disabled={!dbReady || pending || uploadBlocking}
            />
          </div>

          <fieldset className="space-y-3" disabled={!dbReady || pending || uploadBlocking}>
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
            <ProjectDescriptionField disabled={!dbReady || pending || uploadBlocking} />
          </div>

          <ProjectIntakeDocumentField
            disabled={!dbReady || pending}
            onStatusChange={setUploadStatus}
          />

          <Button
            type="submit"
            disabled={!dbReady || pending || uploadBlocking}
            className="h-11 w-full gap-1"
          >
            <Plus className="size-4" aria-hidden />
            {pending ? t('creating') : '사업 검토 시작'}
          </Button>

          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}
        </form>
      </div>

      {recentPreview.length > 0 ? (
        <section className="space-y-3" data-testid="recent-projects-preview">
          <h2 className="text-sm font-medium text-muted-foreground">{t('recentProjects')}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {recentPreview.map((project) => (
              <MyProjectListItem key={project.id} project={project} variant="active" />
            ))}
          </ul>
          {projects.length > recentPreview.length ? (
            <a
              href="/projects"
              className="inline-block text-sm font-medium text-primary underline-offset-2 hover:underline"
              data-testid="all-projects-link"
            >
              전체 프로젝트 보기
            </a>
          ) : null}
        </section>
      ) : dbReady ? (
        <p className="text-center text-sm text-muted-foreground">{t('emptyHint')}</p>
      ) : null}
      </div>

      {archivedProjects.length > 0 ? (
        <section className="space-y-3">
          <button
            type="button"
            data-testid="project-archived-toggle"
            className="text-sm font-medium text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => setShowArchived((v) => !v)}
          >
            {showArchived ? t('lifecycle.hideArchived') : t('lifecycle.showArchived')}
          </button>
          {showArchived ? (
            <ul className="divide-y divide-border/60 rounded-2xl border border-border/70 bg-card">
              {archivedProjects.map((project) => (
                <MyProjectListItem key={project.id} project={project} variant="archived" />
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
