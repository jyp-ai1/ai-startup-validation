'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import type { GovernmentGrant } from '@repo/types/validation';
import {
  GRANT_CATEGORIES,
  GRANT_STATUSES,
  GRANT_SUPPORT_TYPES,
  GRANT_TARGET_STAGES,
} from '@repo/types/validation';
import { Button, Input, Textarea } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { FormSelect } from '@/features/research/components/form-select';

import { createGrant, updateGrant, type GrantActionState } from '../actions/grant-actions';
import {
  GRANT_CATEGORY_LABELS,
  GRANT_STATUS_LABELS,
  GRANT_SUPPORT_TYPE_LABELS,
  GRANT_TARGET_STAGE_LABELS,
} from '../schemas/grant-schema';

const initialState: GrantActionState = {};
const NONE_VALUE = 'NONE';

type GrantFormProps = {
  mode: 'create' | 'edit';
  projectId: string;
  grant?: GovernmentGrant;
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

const withNone = <T extends string>(
  options: readonly T[],
  labels: Record<T, string>,
  noneLabel: string,
) => [
  { value: NONE_VALUE, label: noneLabel },
  ...options.map((value) => ({ value, label: labels[value] })),
];

export function GrantForm({ mode, projectId, grant }: GrantFormProps) {
  const action =
    mode === 'create'
      ? createGrant.bind(null, projectId)
      : updateGrant.bind(null, projectId, grant!.id);

  const [state, formAction, pending] = useActionState(action, initialState);

  const cancelHref =
    mode === 'create'
      ? `/projects/${projectId}/grants`
      : `/projects/${projectId}/grants/${grant?.id}`;

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="name" required>
            Name
          </FormLabel>
          <Input
            id="name"
            name="name"
            defaultValue={grant?.name ?? ''}
            placeholder="예비창업패키지"
            aria-invalid={Boolean(state.fieldErrors?.name)}
          />
          <FieldError messages={state.fieldErrors?.name} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="organization" required>
            Organization
          </FormLabel>
          <Input
            id="organization"
            name="organization"
            defaultValue={grant?.organization ?? ''}
            placeholder="중소벤처기업부"
            aria-invalid={Boolean(state.fieldErrors?.organization)}
          />
          <FieldError messages={state.fieldErrors?.organization} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="description">Description</FormLabel>
          <Textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={grant?.description ?? ''}
            placeholder="지원사업 설명"
          />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="category">Category</FormLabel>
          <FormSelect
            name="category"
            options={withNone(GRANT_CATEGORIES, GRANT_CATEGORY_LABELS, 'Not specified')}
            defaultValue={grant?.category ?? NONE_VALUE}
            placeholder="Category"
          />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="targetStage">Target Stage</FormLabel>
          <FormSelect
            name="targetStage"
            options={withNone(
              GRANT_TARGET_STAGES,
              GRANT_TARGET_STAGE_LABELS,
              'Not specified',
            )}
            defaultValue={grant?.targetStage ?? NONE_VALUE}
            placeholder="Target Stage"
          />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="supportType">Support Type</FormLabel>
          <FormSelect
            name="supportType"
            options={withNone(
              GRANT_SUPPORT_TYPES,
              GRANT_SUPPORT_TYPE_LABELS,
              'Not specified',
            )}
            defaultValue={grant?.supportType ?? NONE_VALUE}
            placeholder="Support Type"
          />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="status">Status</FormLabel>
          <FormSelect
            name="status"
            options={GRANT_STATUSES.map((value) => ({
              value,
              label: GRANT_STATUS_LABELS[value],
            }))}
            defaultValue={grant?.status ?? 'OPEN'}
            placeholder="Status"
          />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="amount">Amount</FormLabel>
          <Input
            id="amount"
            name="amount"
            defaultValue={grant?.amount ?? ''}
            placeholder="최대 1억원"
          />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="deadline">Deadline</FormLabel>
          <Input
            id="deadline"
            name="deadline"
            type="date"
            defaultValue={grant?.deadline?.slice(0, 10) ?? ''}
          />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="fitScore">Fit Score (0-100)</FormLabel>
          <Input
            id="fitScore"
            name="fitScore"
            type="number"
            min={0}
            max={100}
            defaultValue={grant?.fitScore ?? ''}
            placeholder="90"
            aria-invalid={Boolean(state.fieldErrors?.fitScore)}
          />
          <FieldError messages={state.fieldErrors?.fitScore} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="eligibility">Eligibility</FormLabel>
          <Textarea
            id="eligibility"
            name="eligibility"
            rows={3}
            defaultValue={grant?.eligibility ?? ''}
            placeholder="지원 대상 및 자격요건"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="applicationUrl">Application URL</FormLabel>
          <Input
            id="applicationUrl"
            name="applicationUrl"
            type="url"
            defaultValue={grant?.applicationUrl ?? ''}
            placeholder="https://..."
            aria-invalid={Boolean(state.fieldErrors?.applicationUrl)}
          />
          <FieldError messages={state.fieldErrors?.applicationUrl} />
        </div>
      </div>

      <div className={cn('flex items-center gap-3')}>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving...' : mode === 'create' ? 'Create Grant' : 'Save Changes'}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
