'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useActionState } from 'react';

import type { Competitor } from '@repo/types/validation';
import {
  COMPETITOR_CATEGORIES,
  COMPETITOR_MARKET_POSITIONS,
} from '@repo/types/validation';
import { Button, Input, Textarea } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { FormSelect } from '@/features/research/components/form-select';
import { useFormLabels } from '@/lib/i18n/use-form-labels';
import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';

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

export function CompetitorForm({
  mode,
  projectId,
  competitor,
}: CompetitorFormProps) {
  const tCommon = useTranslations('common');
  const labels = useFormLabels();
  const { trackEvent } = useAnalytics();
  const action =
    mode === 'create'
      ? createCompetitor.bind(null, projectId)
      : updateCompetitor.bind(null, projectId, competitor!.id);

  const [state, formAction, pending] = useActionState(action, initialState);

  const cancelHref =
    mode === 'create'
      ? `/projects/${projectId}/competitors`
      : `/projects/${projectId}/competitors/${competitor?.id}`;

  const marketPositionOptions = [
    { value: NONE_VALUE, label: tCommon('notSpecified') },
    ...COMPETITOR_MARKET_POSITIONS.map((position) => ({
      value: position,
      label: COMPETITOR_MARKET_POSITION_LABELS[position],
    })),
  ];

  return (
    <form
      action={formAction}
      onSubmit={() =>
        trackEvent(ANALYTICS_EVENTS.competitorCreate, {
          project_id: projectId,
          screen: `/projects/${projectId}/competitors/new`,
        })
      }
      className="space-y-6"
    >
      {state.error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="name" required>
            {tCommon('fields.companyName')}
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
            {tCommon('fields.category')}
          </FormLabel>
          <FormSelect
            name="category"
            options={categoryOptions}
            defaultValue={competitor?.category ?? ''}
            placeholder={tCommon('placeholders.selectCategory')}
            required
            aria-invalid={Boolean(state.fieldErrors?.category)}
          />
          <FieldError messages={state.fieldErrors?.category} />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="marketPosition">{tCommon('fields.marketPosition')}</FormLabel>
          <FormSelect
            name="marketPosition"
            options={marketPositionOptions}
            defaultValue={competitor?.marketPosition ?? NONE_VALUE}
            placeholder={tCommon('fields.marketPosition')}
          />
          <FieldError messages={state.fieldErrors?.marketPosition} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="description">{tCommon('fields.description')}</FormLabel>
          <Textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={competitor?.description ?? ''}
            placeholder="서비스 개요"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="website">{tCommon('fields.website')}</FormLabel>
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
          <FormLabel htmlFor="targetCustomer">{tCommon('fields.targetCustomer')}</FormLabel>
          <Input
            id="targetCustomer"
            name="targetCustomer"
            defaultValue={competitor?.targetCustomer ?? ''}
            placeholder="60대 이상"
          />
        </div>

        <div className="space-y-2">
          <FormLabel htmlFor="businessModel">{tCommon('fields.businessModel')}</FormLabel>
          <Input
            id="businessModel"
            name="businessModel"
            defaultValue={competitor?.businessModel ?? ''}
            placeholder="Subscription"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="pricing">{tCommon('fields.pricing')}</FormLabel>
          <Input
            id="pricing"
            name="pricing"
            defaultValue={competitor?.pricing ?? ''}
            placeholder="월 9,900원"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="strengths">{tCommon('fields.strengths')}</FormLabel>
          <Textarea
            id="strengths"
            name="strengths"
            rows={3}
            defaultValue={competitor?.strengths ?? ''}
            placeholder="핵심 강점"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="weaknesses">{tCommon('fields.weaknesses')}</FormLabel>
          <Textarea
            id="weaknesses"
            name="weaknesses"
            rows={3}
            defaultValue={competitor?.weaknesses ?? ''}
            placeholder="약점 및 한계"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <FormLabel htmlFor="differentiation">{tCommon('fields.differentiation')}</FormLabel>
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
            ? labels.saving
            : mode === 'create'
              ? labels.createCompetitor
              : labels.saveChanges}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={cancelHref}>{labels.cancel}</Link>
        </Button>
      </div>
    </form>
  );
}
