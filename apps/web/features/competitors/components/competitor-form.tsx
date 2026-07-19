'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import type { Competitor } from '@repo/types/validation';
import {
  COMPETITOR_CATEGORIES,
  COMPETITOR_MARKET_POSITIONS,
} from '@repo/types/validation';
import { Button, Input, Textarea } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { FormSelect } from '@/features/research/components/form-select';

import {
  createCompetitor,
  updateCompetitor,
  type CompetitorActionState,
} from '../actions/competitor-actions';
import {
  COMPETITOR_CATEGORY_DESCRIPTIONS,
  COMPETITOR_CATEGORY_LABELS,
  COMPETITOR_MARKET_POSITION_LABELS,
} from '../schemas/competitor-schema';

const initialState: CompetitorActionState = {};
const NONE_VALUE = 'NONE';

type CompetitorFormProps = {
  mode: 'create' | 'edit';
  projectId: string;
  competitor?: Competitor;
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

const categoryOptions = COMPETITOR_CATEGORIES.map((category) => ({
  value: category,
  label: `${COMPETITOR_CATEGORY_LABELS[category]} — ${COMPETITOR_CATEGORY_DESCRIPTIONS[category]}`,
}));

const marketPositionOptions = [
  { value: NONE_VALUE, label: 'Not specified' },
  ...COMPETITOR_MARKET_POSITIONS.map((position) => ({
    value: position,
    label: COMPETITOR_MARKET_POSITION_LABELS[position],
  })),
];

export function CompetitorForm({
  mode,
  projectId,
  competitor,
}: CompetitorFormProps) {
  const action =
    mode === 'create'
      ? createCompetitor.bind(null, projectId)
      : updateCompetitor.bind(null, projectId, competitor!.id);

  const [state, formAction, pending] = useActionState(action, initialState);

  const cancelHref =
    mode === 'create'
      ? `/projects/${projectId}/competitors`
      : `/projects/${projectId}/competitors/${competitor?.id}`;

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
            Company Name
          </FormLabel>
          <Input
            id="name"
            name="name"
            defaultValue={competitor?.name ?? ''}
            placeholder="시니어 소개 플랫폼"
            aria-invalid={Boolean(state.fieldErrors?.name)}
          />
          <FieldError messages={state.fieldErrors?.name} />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="category" required>
            Category
          </FormLabel>
          <FormSelect
            name="category"
            options={categoryOptions}
            defaultValue={competitor?.category ?? ''}
            placeholder="Category 선택"
            required
            aria-invalid={Boolean(state.fieldErrors?.category)}
          />
          <FieldError messages={state.fieldErrors?.category} />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="marketPosition">Market Position</FormLabel>
          <FormSelect
            name="marketPosition"
            options={marketPositionOptions}
            defaultValue={competitor?.marketPosition ?? NONE_VALUE}
            placeholder="Market Position 선택"
          />
          <FieldError messages={state.fieldErrors?.marketPosition} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="description">Description</FormLabel>
          <Textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={competitor?.description ?? ''}
            placeholder="서비스 개요"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="website">Website</FormLabel>
          <Input
            id="website"
            name="website"
            type="url"
            defaultValue={competitor?.website ?? ''}
            placeholder="https://..."
            aria-invalid={Boolean(state.fieldErrors?.website)}
          />
          <FieldError messages={state.fieldErrors?.website} />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="targetCustomer">Target Customer</FormLabel>
          <Input
            id="targetCustomer"
            name="targetCustomer"
            defaultValue={competitor?.targetCustomer ?? ''}
            placeholder="60대 이상"
          />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="businessModel">Business Model</FormLabel>
          <Input
            id="businessModel"
            name="businessModel"
            defaultValue={competitor?.businessModel ?? ''}
            placeholder="Subscription"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="pricing">Pricing</FormLabel>
          <Input
            id="pricing"
            name="pricing"
            defaultValue={competitor?.pricing ?? ''}
            placeholder="월 9,900원"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="strengths">Strengths</FormLabel>
          <Textarea
            id="strengths"
            name="strengths"
            rows={3}
            defaultValue={competitor?.strengths ?? ''}
            placeholder="핵심 강점"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="weaknesses">Weaknesses</FormLabel>
          <Textarea
            id="weaknesses"
            name="weaknesses"
            rows={3}
            defaultValue={competitor?.weaknesses ?? ''}
            placeholder="약점 및 한계"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="differentiation">Differentiation</FormLabel>
          <Textarea
            id="differentiation"
            name="differentiation"
            rows={3}
            defaultValue={competitor?.differentiation ?? ''}
            placeholder="우리 서비스 대비 차별점"
          />
        </div>
      </div>

      <div className={cn('flex items-center gap-3')}>
        <Button type="submit" disabled={pending}>
          {pending
            ? 'Saving...'
            : mode === 'create'
              ? 'Create Competitor'
              : 'Save Changes'}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
