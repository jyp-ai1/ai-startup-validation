'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useTranslations } from 'next-intl';

import type { ProjectDashboardStats } from '@/features/dashboard/types';
import type { StartupProject, ValidationAgentOutput } from '@repo/types/validation';
import {
  Badge,
  Button,
  Input,
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
  stats: ProjectDashboardStats;
};

export function ValidationAgentPanel({ project, stats }: ValidationAgentPanelProps) {
  const t = useTranslations();
  const action = askValidationAgent.bind(null, project.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  const kpis = [
    { label: t('agent.kpi.evidence'), value: String(stats.evidence.total) },
    { label: t('agent.kpi.highConfidence'), value: String(stats.evidence.byConfidence.HIGH) },
    { label: t('agent.kpi.voc'), value: String(stats.voc.total) },
    { label: t('agent.kpi.score'), value: String(stats.validationScore?.totalScore ?? '—') },
  ];

  return (
    <div className="space-y-16 pb-16 motion-safe:animate-in motion-safe:fade-in">
      <header className="ll-section-rule space-y-3">
        <div className="ll-accent-rule" />
        <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {t('meta.appTagline')}
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-intelligence-section font-semibold tracking-tight">{t('agent.title')}</h1>
            <p className="mt-2 max-w-2xl text-base text-muted-foreground">
              {t('agent.description', { project: project.title })}
            </p>
          </div>
          <Button variant="outline" className="h-11 px-6" asChild>
            <Link href={`/projects/${project.id}/knowledge`}>{t('nav.knowledge')}</Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="ll-consulting-card px-6 py-6">
            <p className="text-[13px] text-muted-foreground">{kpi.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="ll-consulting-card p-8">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('agent.ask')}
        </p>
        <form action={formAction} className="mt-6 space-y-4">
          {state.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {state.error}
            </div>
          ) : null}

          <div className="space-y-2">
            <label htmlFor="question" className="text-sm font-medium">
              {t('agent.questionLabel')}
            </label>
            <Input
              id="question"
              name="question"
              required
              className="h-11"
              placeholder={t('agent.questionPlaceholder')}
            />
            {state.fieldErrors?.question ? (
              <p className="text-sm text-destructive">{state.fieldErrors.question[0]}</p>
            ) : null}
          </div>

          <Button type="submit" className="h-11 px-6" disabled={pending}>
            {pending ? t('agent.analyzing') : t('agent.submit')}
          </Button>
        </form>
      </div>

      {state.output ? (
        <AgentRecommendation output={state.output} usedMock={state.usedMock} />
      ) : null}
    </div>
  );
}

function AgentRecommendation({
  output,
  usedMock,
}: {
  output: ValidationAgentOutput;
  usedMock?: boolean;
}) {
  const t = useTranslations();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={DECISION_VARIANT[output.decision]}>{output.decision}</Badge>
        <Badge variant="outline">
          {t('agent.confidence')}: {output.confidence}
        </Badge>
        {usedMock ? <Badge variant="secondary">{t('agent.mockMode')}</Badge> : null}
      </div>

      <div className="ll-consulting-card p-8">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('agent.summary')}
        </p>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">{output.summary}</p>
      </div>

      <div className="ll-consulting-card p-8">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('agent.recommendation')}
        </p>
        <div
          className="prose prose-sm dark:prose-invert mt-4 max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(output.recommendation) }}
        />
      </div>

      {output.sources.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{t('agent.sources')}</h2>
          {output.sources.map((source, index) => (
            <div key={`${source.title}-${index}`} className="ll-consulting-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-base font-semibold">{source.title}</p>
                <Badge variant="outline">{source.source}</Badge>
              </div>
              {source.score !== undefined ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t('agent.similarity')}: {source.score}
                </p>
              ) : null}
              <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{source.excerpt}</p>
            </div>
          ))}
        </div>
      ) : null}

      {output.nextActions.length > 0 ? (
        <div className="ll-consulting-card p-8">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('agent.nextActions')}
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {output.nextActions.map((action) => (
              <li key={action} className="flex gap-3">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-consulting-accent" />
                {action}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
