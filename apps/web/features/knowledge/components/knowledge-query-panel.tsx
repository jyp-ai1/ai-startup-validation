'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useActionState } from 'react';

import type { StartupProject } from '@repo/types/validation';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  PageHeader,
} from '@repo/ui';

import { queryKnowledge, type KnowledgeActionState } from '../actions/knowledge-actions';

const initialState: KnowledgeActionState = {};

type KnowledgeQueryPanelProps = {
  project: StartupProject;
};

export function KnowledgeQueryPanel({ project }: KnowledgeQueryPanelProps) {
  const tNav = useTranslations('common.navLinks');
  const action = queryKnowledge.bind(null, project.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <>
      <PageHeader
        title="Knowledge Query"
        description={`Search indexed evidence for ${project.title}`}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${project.id}/knowledge`}>{tNav('backToKnowledge')}</Link>
        </Button>
      </div>

      <form action={formAction} className="mt-8 max-w-2xl space-y-4">
        {state.error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {state.error}
          </div>
        ) : null}

        <div className="space-y-2">
          <label htmlFor="question" className="text-sm font-medium">
            Ask a question
          </label>
          <Input
            id="question"
            name="question"
            required
            placeholder='e.g. "실버 시장 성장 근거는?"'
          />
          {state.fieldErrors?.question ? (
            <p className="text-sm text-destructive">{state.fieldErrors.question[0]}</p>
          ) : null}
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? 'Searching...' : 'Search Knowledge'}
        </Button>
      </form>

      {state.results && state.results.length > 0 ? (
        <div className="mt-10 space-y-4">
          <h2 className="text-lg font-semibold">Results</h2>
          {state.results.map((result, index) => (
            <Card key={`${result.chunkId ?? result.title}-${index}`}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">{result.title}</CardTitle>
                  <Badge variant="secondary">Score {result.score}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge variant="outline">{result.source}</Badge>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {result.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : state.success && state.results?.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          No matching knowledge found. Process Evidence first.
        </p>
      ) : null}
    </>
  );
}
