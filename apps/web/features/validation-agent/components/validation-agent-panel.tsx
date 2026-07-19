'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import type { StartupProject, ValidationAgentOutput } from '@repo/types/validation';
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

import { renderMarkdown } from '@/features/reports/utils/markdown';

import { askValidationAgent, type ValidationAgentActionState } from '../actions/agent-actions';

const initialState: ValidationAgentActionState = {};

const DECISION_VARIANT: Record<
  ValidationAgentOutput['decision'],
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  GO: 'default',
  'CONDITIONAL GO': 'secondary',
  'NO GO': 'destructive',
  'INSUFFICIENT DATA': 'outline',
};

type ValidationAgentPanelProps = {
  project: StartupProject;
};

export function ValidationAgentPanel({ project }: ValidationAgentPanelProps) {
  const action = askValidationAgent.bind(null, project.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <>
      <PageHeader
        title="Validation Agent"
        description={`AI startup consultant for ${project.title}`}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${project.id}`}>Back to project</Link>
        </Button>
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${project.id}/knowledge`}>Knowledge Base</Link>
        </Button>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">Ask the Agent</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            {state.error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {state.error}
              </div>
            ) : null}

            <div className="space-y-2">
              <label htmlFor="question" className="text-sm font-medium">
                Your question
              </label>
              <Input
                id="question"
                name="question"
                required
                placeholder='e.g. "이 시장이 성장한다는 근거는?"'
              />
              {state.fieldErrors?.question ? (
                <p className="text-sm text-destructive">{state.fieldErrors.question[0]}</p>
              ) : null}
            </div>

            <Button type="submit" disabled={pending}>
              {pending ? 'Analyzing...' : 'Get Recommendation'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {state.output ? (
        <AgentRecommendation output={state.output} usedMock={state.usedMock} />
      ) : null}
    </>
  );
}

function AgentRecommendation({
  output,
  usedMock,
}: {
  output: ValidationAgentOutput;
  usedMock?: boolean;
}) {
  return (
    <div className="mt-10 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={DECISION_VARIANT[output.decision]}>{output.decision}</Badge>
        <Badge variant="outline">Confidence: {output.confidence}</Badge>
        {usedMock ? <Badge variant="secondary">Mock mode</Badge> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{output.summary}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recommendation</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(output.recommendation) }}
          />
        </CardContent>
      </Card>

      {output.sources.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Sources</h2>
          {output.sources.map((source, index) => (
            <Card key={`${source.title}-${index}`}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">{source.title}</CardTitle>
                  <Badge variant="outline">{source.source}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {source.score !== undefined ? (
                  <p className="mb-2 text-xs text-muted-foreground">
                    Similarity: {source.score}
                  </p>
                ) : null}
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {source.excerpt}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {output.nextActions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Next Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {output.nextActions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
