'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import type { StartupProject } from '@repo/types/validation';
import { Button, Input, Textarea } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

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

function FieldError({
  messages,
}: {
  messages?: string[];
}) {
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
            프로젝트명
          </FormLabel>
          <Input
            id="title"
            name="title"
            defaultValue={project?.title ?? ''}
            placeholder="실버 세대 매칭 서비스"
            aria-invalid={Boolean(state.fieldErrors?.title)}
          />
          <FieldError messages={state.fieldErrors?.title} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="summary" required>
            서비스 한줄 설명
          </FormLabel>
          <Textarea
            id="summary"
            name="summary"
            rows={3}
            defaultValue={project?.summary ?? ''}
            placeholder="60대 이상 사용자를 위한 관계 형성 플랫폼"
            aria-invalid={Boolean(state.fieldErrors?.summary)}
          />
          <FieldError messages={state.fieldErrors?.summary} />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="industry">산업군</FormLabel>
          <Input
            id="industry"
            name="industry"
            defaultValue={project?.industry ?? ''}
            placeholder="Senior Tech"
          />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="businessModel">비즈니스 모델</FormLabel>
          <Input
            id="businessModel"
            name="businessModel"
            defaultValue={project?.businessModel ?? ''}
            placeholder="Subscription"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="problem">문제 정의</FormLabel>
          <Textarea
            id="problem"
            name="problem"
            rows={4}
            defaultValue={project?.problem ?? ''}
            placeholder="고령층 사회적 연결 부족"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="solution">해결 방법</FormLabel>
          <Textarea
            id="solution"
            name="solution"
            rows={4}
            defaultValue={project?.solution ?? ''}
            placeholder="AI 기반 관계 매칭"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="targetCustomer">타겟 고객</FormLabel>
          <Input
            id="targetCustomer"
            name="targetCustomer"
            defaultValue={project?.targetCustomer ?? ''}
            placeholder="60대 이상"
          />
        </div>
      </div>

      <div className={cn('flex items-center gap-3')}>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving...' : mode === 'create' ? 'Create Project' : 'Save Changes'}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={mode === 'create' ? '/projects' : `/projects/${project?.id}`}>
            Cancel
          </Link>
        </Button>
      </div>
    </form>
  );
}
