'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { Button, Input } from '@repo/ui';

import { createReport, type ReportActionState } from '../actions/report-actions';

const initialState: ReportActionState = {};

type ReportFormProps = {
  projectId: string;
};

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-sm text-destructive">{messages[0]}</p>;
}

export function ReportForm({ projectId }: ReportFormProps) {
  const action = createReport.bind(null, projectId);
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
          Report Title
        </label>
        <Input
          id="title"
          name="title"
          required
          placeholder="e.g. 실버 세대 매칭 서비스 사업 검증 보고서"
          aria-invalid={Boolean(state.fieldErrors?.title)}
        />
        <FieldError messages={state.fieldErrors?.title} />
      </div>

      <p className="text-sm text-muted-foreground">
        10 default sections will be created automatically (Executive Summary through Next
        Action).
      </p>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating...' : 'Create Report'}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={`/projects/${projectId}/reports`}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
