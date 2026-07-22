'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useTranslations } from 'next-intl';

import type { StartupProject } from '@repo/types/validation';
import { Button, Input, Textarea } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { useFormLabels } from '@/lib/i18n/use-form-labels';

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
  const action =
    mode === 'create'
      ? createProject
      : updateProject.bind(null, project!.id);

  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
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
