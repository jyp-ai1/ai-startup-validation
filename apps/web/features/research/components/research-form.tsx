'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import type { ResearchPlan } from '@repo/types/validation';
import {
  RESEARCH_PLAN_STATUSES,
  RESEARCH_PRIORITIES,
  RESEARCH_TYPES,
} from '@repo/types/validation';
import { Button, Input, Textarea } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  createResearchPlan,
  updateResearchPlan,
  type ResearchActionState,
} from '../actions/research-actions';
import {
  RESEARCH_PRIORITY_LABELS,
  RESEARCH_STATUS_LABELS,
  RESEARCH_TYPE_LABELS,
} from '../schemas/research-schema';
import { FormSelect } from './form-select';

const initialState: ResearchActionState = {};

type ResearchFormProps = {
  mode: 'create' | 'edit';
  projectId: string;
  plan?: ResearchPlan;
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

const typeOptions = RESEARCH_TYPES.map((type) => ({
  value: type,
  label: RESEARCH_TYPE_LABELS[type],
}));

const priorityOptions = RESEARCH_PRIORITIES.map((priority) => ({
  value: priority,
  label: RESEARCH_PRIORITY_LABELS[priority],
}));

const statusOptions = RESEARCH_PLAN_STATUSES.map((status) => ({
  value: status,
  label: RESEARCH_STATUS_LABELS[status],
}));

export function ResearchForm({ mode, projectId, plan }: ResearchFormProps) {
  const action =
    mode === 'create'
      ? createResearchPlan.bind(null, projectId)
      : updateResearchPlan.bind(null, projectId, plan!.id);

  const [state, formAction, pending] = useActionState(action, initialState);

  const cancelHref =
    mode === 'create'
      ? `/projects/${projectId}/research`
      : `/projects/${projectId}/research/${plan?.id}`;

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
            Research 제목
          </FormLabel>
          <Input
            id="title"
            name="title"
            defaultValue={plan?.title ?? ''}
            placeholder="고령층 시장 규모 분석"
            aria-invalid={Boolean(state.fieldErrors?.title)}
          />
          <FieldError messages={state.fieldErrors?.title} />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="researchType" required>
            Research Type
          </FormLabel>
          <FormSelect
            name="researchType"
            options={typeOptions}
            defaultValue={plan?.researchType ?? ''}
            placeholder="Type 선택"
            required
            aria-invalid={Boolean(state.fieldErrors?.researchType)}
          />
          <FieldError messages={state.fieldErrors?.researchType} />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="priority">Priority</FormLabel>
          <FormSelect
            name="priority"
            options={priorityOptions}
            defaultValue={plan?.priority ?? 'MEDIUM'}
            placeholder="Priority 선택"
          />
          <FieldError messages={state.fieldErrors?.priority} />
        </div>

        {mode === 'edit' ? (
          <div className="space-y-2 md:col-span-2">
            <FormLabel htmlFor="status">Status</FormLabel>
            <FormSelect
              name="status"
              options={statusOptions}
              defaultValue={plan?.status ?? 'TODO'}
              placeholder="Status 선택"
            />
            <FieldError messages={state.fieldErrors?.status} />
          </div>
        ) : null}

        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="description">Description</FormLabel>
          <Textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={plan?.description ?? ''}
            placeholder="조사 목적과 범위를 설명하세요"
          />
          <FieldError messages={state.fieldErrors?.description} />
        </div>
      </div>

      <div className={cn('flex items-center gap-3')}>
        <Button type="submit" disabled={pending}>
          {pending
            ? 'Saving...'
            : mode === 'create'
              ? 'Create Research Plan'
              : 'Save Changes'}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
