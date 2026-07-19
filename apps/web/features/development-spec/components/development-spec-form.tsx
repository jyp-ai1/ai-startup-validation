'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import type { PRD } from '@repo/types/validation';
import { Button, Input } from '@repo/ui';

import {
  createDevelopmentSpec,
  type DevelopmentSpecActionState,
} from '../actions/development-spec-actions';

const initialState: DevelopmentSpecActionState = {};

type DevelopmentSpecFormProps = {
  projectId: string;
  prds: PRD[];
};

export function DevelopmentSpecForm({ projectId, prds }: DevelopmentSpecFormProps) {
  const action = createDevelopmentSpec.bind(null, projectId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const defaultPRD = prds[0];

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      {state.error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          Spec Title
        </label>
        <Input
          id="title"
          name="title"
          required
          placeholder="e.g. 실버 세대 매칭 서비스 개발 명세"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="prdId" className="text-sm font-medium">
          Source PRD
        </label>
        <select
          id="prdId"
          name="prdId"
          required
          defaultValue={defaultPRD?.id}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {prds.map((prd) => (
            <option key={prd.id} value={prd.id}>
              {prd.title}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-muted-foreground">
        13 default sections will be created. Use AI generation to fill content.
      </p>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating...' : 'Create Development Spec'}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={`/projects/${projectId}/development-spec`}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
