'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useActionState } from 'react';

import type { VOC } from '@repo/types/validation';
import {
  VOC_CUSTOMER_SEGMENTS,
  VOC_EMOTIONS,
  VOC_FREQUENCIES,
  VOC_SEVERITIES,
  VOC_SOURCE_TYPES,
  VOC_WILLINGNESS_TO_PAY,
} from '@repo/types/validation';
import { Button, Input, Textarea } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { FormSelect } from '@/features/research/components/form-select';
import { useFormLabels } from '@/lib/i18n/use-form-labels';

import { createVOC, updateVOC, type VOCActionState } from '../actions/voc-actions';
import {
  VOC_CUSTOMER_SEGMENT_LABELS,
  VOC_EMOTION_LABELS,
  VOC_FREQUENCY_LABELS,
  VOC_SEVERITY_LABELS,
  VOC_SOURCE_TYPE_LABELS,
  VOC_WILLINGNESS_LABELS,
} from '../schemas/voc-schema';

const initialState: VOCActionState = {};
const NONE_VALUE = 'NONE';

type VOCFormProps = {
  mode: 'create' | 'edit';
  projectId: string;
  entry?: VOC;
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

export function VOCForm({ mode, projectId, entry }: VOCFormProps) {
  const tCommon = useTranslations('common');
  const labels = useFormLabels();
  const action =
    mode === 'create'
      ? createVOC.bind(null, projectId)
      : updateVOC.bind(null, projectId, entry!.id);

  const [state, formAction, pending] = useActionState(action, initialState);

  const cancelHref =
    mode === 'create'
      ? `/projects/${projectId}/voc`
      : `/projects/${projectId}/voc/${entry?.id}`;

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
            {tCommon('fields.title')}
          </FormLabel>
          <Input
            id="title"
            name="title"
            defaultValue={entry?.title ?? ''}
            placeholder="새로운 사람을 만날 기회 부족"
            aria-invalid={Boolean(state.fieldErrors?.title)}
          />
          <FieldError messages={state.fieldErrors?.title} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="content" required>
            {tCommon('fields.content')}
          </FormLabel>
          <Textarea
            id="content"
            name="content"
            rows={4}
            defaultValue={entry?.content ?? ''}
            placeholder="고객 원문 또는 인터뷰 내용"
            aria-invalid={Boolean(state.fieldErrors?.content)}
          />
          <FieldError messages={state.fieldErrors?.content} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="painPoint" required>
            {tCommon('fields.painPoint')}
          </FormLabel>
          <Input
            id="painPoint"
            name="painPoint"
            defaultValue={entry?.painPoint ?? ''}
            placeholder="사회적 관계 감소"
            aria-invalid={Boolean(state.fieldErrors?.painPoint)}
          />
          <FieldError messages={state.fieldErrors?.painPoint} />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="sourceType">{tCommon('fields.sourceType')}</FormLabel>
          <FormSelect
            name="sourceType"
            options={withNone(
              VOC_SOURCE_TYPES,
              VOC_SOURCE_TYPE_LABELS,
              tCommon('notSpecified'),
            )}
            defaultValue={entry?.sourceType ?? NONE_VALUE}
            placeholder={tCommon('placeholders.selectSourceType')}
          />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="customerSegment">{tCommon('fields.customerSegment')}</FormLabel>
          <FormSelect
            name="customerSegment"
            options={withNone(
              VOC_CUSTOMER_SEGMENTS,
              VOC_CUSTOMER_SEGMENT_LABELS,
              tCommon('notSpecified'),
            )}
            defaultValue={entry?.customerSegment ?? NONE_VALUE}
            placeholder={tCommon('fields.customerSegment')}
          />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="emotion">{tCommon('fields.emotion')}</FormLabel>
          <FormSelect
            name="emotion"
            options={withNone(VOC_EMOTIONS, VOC_EMOTION_LABELS, tCommon('notSpecified'))}
            defaultValue={entry?.emotion ?? NONE_VALUE}
            placeholder={tCommon('fields.emotion')}
          />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="frequency">{tCommon('fields.frequency')}</FormLabel>
          <FormSelect
            name="frequency"
            options={withNone(
              VOC_FREQUENCIES,
              VOC_FREQUENCY_LABELS,
              tCommon('notSpecified'),
            )}
            defaultValue={entry?.frequency ?? NONE_VALUE}
            placeholder={tCommon('fields.frequency')}
          />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="severity">{tCommon('fields.severity')}</FormLabel>
          <FormSelect
            name="severity"
            options={withNone(VOC_SEVERITIES, VOC_SEVERITY_LABELS, tCommon('notSpecified'))}
            defaultValue={entry?.severity ?? NONE_VALUE}
            placeholder={tCommon('fields.severity')}
          />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="willingnessToPay">{tCommon('fields.willingnessToPay')}</FormLabel>
          <FormSelect
            name="willingnessToPay"
            options={VOC_WILLINGNESS_TO_PAY.map((value) => ({
              value,
              label: VOC_WILLINGNESS_LABELS[value],
            }))}
            defaultValue={entry?.willingnessToPay ?? 'UNKNOWN'}
            placeholder={tCommon('fields.willingnessToPay')}
          />
        </div>
      </div>

      <div className={cn('flex items-center gap-3')}>
        <Button type="submit" disabled={pending}>
          {pending
            ? labels.saving
            : mode === 'create'
              ? labels.createVoc
              : labels.saveChanges}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={cancelHref}>{labels.cancel}</Link>
        </Button>
      </div>
    </form>
  );
}
