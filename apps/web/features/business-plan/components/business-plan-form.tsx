'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { Button, Input } from '@repo/ui';

import {
  createBusinessPlan,
  type BusinessPlanActionState,
} from '../actions/business-plan-actions';

const initialState: BusinessPlanActionState = {};

type BusinessPlanFormProps = {
  projectId: string;
};

export function BusinessPlanForm({ projectId }: BusinessPlanFormProps) {
  const action = createBusinessPlan.bind(null, projectId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      {state.error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          Plan Title
        </label>
        <Input
          id="title"
          name="title"
          required
          placeholder="e.g. 실버 세대 매칭 서비스 사업계획서"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        16 default sections will be created. Use AI generation to fill content.
      </p>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating...' : 'Create Business Plan'}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={`/projects/${projectId}/business-plan`}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
