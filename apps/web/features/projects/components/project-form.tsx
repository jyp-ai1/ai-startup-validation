'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useTranslations } from 'next-intl';

import type { StartupProject } from '@repo/types/validation';
import { PROJECT_TYPES } from '@repo/types/validation';
import { Button, Input, Textarea } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { useFormLabels } from '@/lib/i18n/use-form-labels';
import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';

import {
  createProject,
  updateProject,
  type ProjectActionState,
} from '../actions/project-actions';

const initialState: ProjectActionState = {};

type ProjectFormProps = {
  mode: 'create' | 'edit';
  project?: StartupProject;
};

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-sm text-destructive">{messages[0]}</p>;
}

function FormLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
    >
      {children}
      {required ? <span className="text-destructive"> *</span> : null}
    </label>
  );
}

export function ProjectForm({ mode, project }: ProjectFormProps) {
  const t = useTranslations('projects.form');
  const labels = useFormLabels();
  const { trackEvent } = useAnalytics();
  const action =
    mode === 'create'
      ? createProject
      : updateProject.bind(null, project!.id);

  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form
      action={formAction}
      onSubmit={() =>
        trackEvent(
          mode === 'create' ? ANALYTICS_EVENTS.projectCreate : ANALYTICS_EVENTS.projectUpdate,
          { screen: mode === 'create' ? '/projects/new' : `/projects/${project?.id}` },
        )
      }
      className="space-y-6"
    >
      {state.error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      ) : null}

      {mode === 'create' ? (
        <fieldset className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4">
          <legend className="px-1 text-sm font-medium">{t('projectTypeLegend')}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {PROJECT_TYPES.map((type, index) => (
              <label
                key={type}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 bg-background px-3 py-2.5 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <input
                  type="radio"
                  name="projectType"
                  value={type}
                  defaultChecked={index === 0}
                  className="size-4 accent-primary"
                />
                <span>{t(`projectTypes.${type}`)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="title" required>
            {t('title')}
          </FormLabel>
          <Input
            id="title"
            name="title"
            defaultValue={project?.title ?? ''}
            placeholder={t('placeholders.title')}
            aria-invalid={Boolean(state.fieldErrors?.title)}
          />
          <FieldError messages={state.fieldErrors?.title} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="summary" required>
            {t('summary')}
          </FormLabel>
          <Textarea
            id="summary"
            name="summary"
            rows={3}
            defaultValue={project?.summary ?? ''}
            placeholder={t('placeholders.summary')}
            aria-invalid={Boolean(state.fieldErrors?.summary)}
          />
          <FieldError messages={state.fieldErrors?.summary} />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="industry">{t('industry')}</FormLabel>
          <Input
            id="industry"
            name="industry"
            defaultValue={project?.industry ?? ''}
            placeholder={t('placeholders.industry')}
          />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="businessModel">{t('businessModel')}</FormLabel>
          <Input
            id="businessModel"
            name="businessModel"
            defaultValue={project?.businessModel ?? ''}
            placeholder={t('placeholders.businessModel')}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="problem">{t('problem')}</FormLabel>
          <Textarea
            id="problem"
            name="problem"
            rows={4}
            defaultValue={project?.problem ?? ''}
            placeholder={t('placeholders.problem')}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="solution">{t('solution')}</FormLabel>
          <Textarea
            id="solution"
            name="solution"
            rows={4}
            defaultValue={project?.solution ?? ''}
            placeholder={t('placeholders.solution')}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="targetCustomer">{t('targetCustomer')}</FormLabel>
          <Input
            id="targetCustomer"
            name="targetCustomer"
            defaultValue={project?.targetCustomer ?? ''}
            placeholder={t('placeholders.targetCustomer')}
          />
        </div>
      </div>

      <div className={cn('flex items-center gap-3')}>
        <Button type="submit" disabled={pending}>
          {pending
            ? labels.saving
            : mode === 'create'
              ? labels.createProject
              : labels.saveChanges}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={mode === 'create' ? '/projects' : `/projects/${project?.id}`}>
            {labels.cancel}
          </Link>
        </Button>
      </div>
    </form>
  );
}
