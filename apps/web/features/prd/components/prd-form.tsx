'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { Button, Input } from '@repo/ui';

import { createPRD, type PRDActionState } from '../actions/prd-actions';

const initialState: PRDActionState = {};

type PRDFormProps = {
  projectId: string;
};

export function PRDForm({ projectId }: PRDFormProps) {
  const action = createPRD.bind(null, projectId);
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
          PRD Title
        </label>
        <Input
          id="title"
          name="title"
          required
          placeholder="e.g. 실버 세대 매칭 서비스 PRD"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        14 default sections will be created. Use AI generation to fill content.
      </p>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating...' : 'Create PRD'}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={`/projects/${projectId}/prd`}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
