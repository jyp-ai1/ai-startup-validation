'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
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
import { useFormLabels } from '@/lib/i18n/use-form-labels';

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
  const tCommon = useTranslations('common');
  const labels = useFormLabels();
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
            {tCommon('fields.name')}
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
            {tCommon('fields.organization')}
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
          <FormLabel htmlFor="description">{tCommon('fields.description')}</FormLabel>
          <Textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={grant?.description ?? ''}
            placeholder="지원사업 설명"
          />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="category">{tCommon('fields.category')}</FormLabel>
          <FormSelect
            name="category"
            options={withNone(GRANT_CATEGORIES, GRANT_CATEGORY_LABELS, tCommon('notSpecified'))}
            defaultValue={grant?.category ?? NONE_VALUE}
            placeholder={tCommon('placeholders.selectCategory')}
          />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="targetStage">{tCommon('fields.targetStage')}</FormLabel>
          <FormSelect
            name="targetStage"
            options={withNone(
              GRANT_TARGET_STAGES,
              GRANT_TARGET_STAGE_LABELS,
              tCommon('notSpecified'),
            )}
            defaultValue={grant?.targetStage ?? NONE_VALUE}
            placeholder={tCommon('fields.targetStage')}
          />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="supportType">{tCommon('fields.supportType')}</FormLabel>
          <FormSelect
            name="supportType"
            options={withNone(
              GRANT_SUPPORT_TYPES,
              GRANT_SUPPORT_TYPE_LABELS,
              tCommon('notSpecified'),
            )}
            defaultValue={grant?.supportType ?? NONE_VALUE}
            placeholder={tCommon('fields.supportType')}
          />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="status">{tCommon('fields.status')}</FormLabel>
          <FormSelect
            name="status"
            options={GRANT_STATUSES.map((value) => ({
              value,
              label: GRANT_STATUS_LABELS[value],
            }))}
            defaultValue={grant?.status ?? 'OPEN'}
            placeholder={tCommon('placeholders.selectStatus')}
          />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="amount">{tCommon('fields.amount')}</FormLabel>
          <Input
            id="amount"
            name="amount"
            defaultValue={grant?.amount ?? ''}
            placeholder="최대 1억원"
          />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="deadline">{tCommon('fields.deadline')}</FormLabel>
          <Input
            id="deadline"
            name="deadline"
            type="date"
            defaultValue={grant?.deadline?.slice(0, 10) ?? ''}
          />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="fitScore">{tCommon('fields.fitScore')} (0-100)</FormLabel>
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
          <FormLabel htmlFor="eligibility">{tCommon('fields.eligibility')}</FormLabel>
          <Textarea
            id="eligibility"
            name="eligibility"
            rows={3}
            defaultValue={grant?.eligibility ?? ''}
            placeholder="지원 대상 및 자격요건"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="applicationUrl">{tCommon('fields.applicationUrl')}</FormLabel>
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
          {pending ? labels.saving : mode === 'create' ? labels.createGrant : labels.saveChanges}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={cancelHref}>{labels.cancel}</Link>
        </Button>
      </div>
    </form>
  );
}
