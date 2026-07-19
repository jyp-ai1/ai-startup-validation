'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import type { Evidence, ResearchPlan } from '@repo/types/validation';
import {
  EVIDENCE_CATEGORIES,
  EVIDENCE_CONFIDENCE_LEVELS,
  EVIDENCE_SOURCE_TYPES,
} from '@repo/types/validation';
import { Button, Input, Textarea } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { FormSelect } from '@/features/research/components/form-select';

import {
  createEvidence,
  updateEvidence,
  type EvidenceActionState,
} from '../actions/evidence-actions';
import {
  EVIDENCE_CATEGORY_LABELS,
  EVIDENCE_CONFIDENCE_LABELS,
  EVIDENCE_SOURCE_TYPE_LABELS,
} from '../schemas/evidence-schema';

const initialState: EvidenceActionState = {};

type EvidenceFormProps = {
  mode: 'create' | 'edit';
  projectId: string;
  researchPlans: ResearchPlan[];
  evidence?: Evidence;
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

const categoryOptions = EVIDENCE_CATEGORIES.map((category) => ({
  value: category,
  label: EVIDENCE_CATEGORY_LABELS[category],
}));

const NONE_VALUE = 'NONE';

const sourceTypeOptions = [
  { value: NONE_VALUE, label: 'Not specified' },
  ...EVIDENCE_SOURCE_TYPES.map((type) => ({
    value: type,
    label: EVIDENCE_SOURCE_TYPE_LABELS[type],
  })),
];

const confidenceOptions = EVIDENCE_CONFIDENCE_LEVELS.map((level) => ({
  value: level,
  label: EVIDENCE_CONFIDENCE_LABELS[level],
}));

export function EvidenceForm({
  mode,
  projectId,
  researchPlans,
  evidence,
}: EvidenceFormProps) {
  const action =
    mode === 'create'
      ? createEvidence.bind(null, projectId)
      : updateEvidence.bind(null, projectId, evidence!.id);

  const [state, formAction, pending] = useActionState(action, initialState);

  const cancelHref =
    mode === 'create'
      ? `/projects/${projectId}/evidence`
      : `/projects/${projectId}/evidence/${evidence?.id}`;

  const researchOptions = [
    { value: NONE_VALUE, label: 'No research link' },
    ...researchPlans.map((plan) => ({
      value: plan.id,
      label: plan.title,
    })),
  ];

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
            Title
          </FormLabel>
          <Input
            id="title"
            name="title"
            defaultValue={evidence?.title ?? ''}
            placeholder="국내 고령 인구 증가 추세"
            aria-invalid={Boolean(state.fieldErrors?.title)}
          />
          <FieldError messages={state.fieldErrors?.title} />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="category" required>
            Category
          </FormLabel>
          <FormSelect
            name="category"
            options={categoryOptions}
            defaultValue={evidence?.category ?? ''}
            placeholder="Category 선택"
            required
            aria-invalid={Boolean(state.fieldErrors?.category)}
          />
          <FieldError messages={state.fieldErrors?.category} />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="confidence">Confidence</FormLabel>
          <FormSelect
            name="confidence"
            options={confidenceOptions}
            defaultValue={evidence?.confidence ?? 'MEDIUM'}
            placeholder="Confidence 선택"
          />
          <FieldError messages={state.fieldErrors?.confidence} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="summary" required>
            Summary
          </FormLabel>
          <Textarea
            id="summary"
            name="summary"
            rows={3}
            defaultValue={evidence?.summary ?? ''}
            placeholder="핵심 근거를 한두 문장으로 요약"
            aria-invalid={Boolean(state.fieldErrors?.summary)}
          />
          <FieldError messages={state.fieldErrors?.summary} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="researchId">Research Plan (optional)</FormLabel>
          <FormSelect
            name="researchId"
            options={researchOptions}
            defaultValue={evidence?.researchId ?? NONE_VALUE}
            placeholder="Research Plan 연결"
          />
          <FieldError messages={state.fieldErrors?.researchId} />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="sourceType">Source Type</FormLabel>
          <FormSelect
            name="sourceType"
            options={sourceTypeOptions}
            defaultValue={evidence?.sourceType ?? NONE_VALUE}
            placeholder="Source Type 선택"
          />
          <FieldError messages={state.fieldErrors?.sourceType} />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="sourceName">Source Name</FormLabel>
          <Input
            id="sourceName"
            name="sourceName"
            defaultValue={evidence?.sourceName ?? ''}
            placeholder="통계청"
          />
          <FieldError messages={state.fieldErrors?.sourceName} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="sourceUrl">Source URL</FormLabel>
          <Input
            id="sourceUrl"
            name="sourceUrl"
            type="url"
            defaultValue={evidence?.sourceUrl ?? ''}
            placeholder="https://..."
            aria-invalid={Boolean(state.fieldErrors?.sourceUrl)}
          />
          <FieldError messages={state.fieldErrors?.sourceUrl} />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="publishedDate">Published Date</FormLabel>
          <Input
            id="publishedDate"
            name="publishedDate"
            type="date"
            defaultValue={evidence?.publishedDate?.slice(0, 10) ?? ''}
          />
          <FieldError messages={state.fieldErrors?.publishedDate} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="content">Content</FormLabel>
          <Textarea
            id="content"
            name="content"
            rows={6}
            defaultValue={evidence?.content ?? ''}
            placeholder="상세 내용, 인용, 메모 등"
          />
          <FieldError messages={state.fieldErrors?.content} />
        </div>
      </div>

      <div className={cn('flex items-center gap-3')}>
        <Button type="submit" disabled={pending}>
          {pending
            ? 'Saving...'
            : mode === 'create'
              ? 'Create Evidence'
              : 'Save Changes'}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
