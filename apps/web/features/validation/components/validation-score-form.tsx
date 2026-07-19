'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import type { ValidationScore } from '@repo/types/validation';
import { Button, Input, Textarea } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  createValidationScore,
  updateValidationScore,
  type ValidationActionState,
} from '../actions/validation-actions';
import { SCORE_CATEGORIES } from '../utils/score-calculator';

const initialState: ValidationActionState = {};

type ValidationScoreFormProps = {
  mode: 'create' | 'edit';
  projectId: string;
  score?: ValidationScore;
};

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-sm text-destructive">{messages[0]}</p>;
}

export function ValidationScoreForm({
  mode,
  projectId,
  score,
}: ValidationScoreFormProps) {
  const action =
    mode === 'create'
      ? createValidationScore.bind(null, projectId)
      : updateValidationScore.bind(null, projectId, score!.id);

  const [state, formAction, pending] = useActionState(action, initialState);

  const cancelHref =
    mode === 'create'
      ? `/projects/${projectId}/validation`
      : `/projects/${projectId}/validation`;

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        {SCORE_CATEGORIES.map((category) => (
          <div key={category.key} className="space-y-2">
            <label htmlFor={category.key} className="text-sm font-medium">
              {category.label}{' '}
              <span className="text-muted-foreground">(0–{category.maxScore})</span>
            </label>
            <p className="text-xs text-muted-foreground">{category.description}</p>
            <Input
              id={category.key}
              name={category.key}
              type="number"
              min={0}
              max={category.maxScore}
              defaultValue={score?.[category.key] ?? ''}
              required
              aria-invalid={Boolean(state.fieldErrors?.[category.key])}
            />
            <FieldError messages={state.fieldErrors?.[category.key]} />
          </div>
        ))}

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="comment" className="text-sm font-medium">
            Comment / Recommendation
          </label>
          <Textarea
            id="comment"
            name="comment"
            rows={4}
            defaultValue={score?.comment ?? ''}
            placeholder="평가 근거 및 추천 의견"
          />
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Total score and GO/NO GO decision are calculated automatically on save.
      </p>

      <div className={cn('flex items-center gap-3')}>
        <Button type="submit" disabled={pending}>
          {pending
            ? 'Saving...'
            : mode === 'create'
              ? 'Create Validation Score'
              : 'Save Changes'}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
