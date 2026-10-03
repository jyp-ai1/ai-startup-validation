'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  PRODUCT_ANALYTICS_EVENTS,
  recordFunnelEvent,
} from '@/lib/analytics/product-analytics';
import { buildProjectCanvasUrl, type ProjectBriefEntry } from '@/lib/auth/journey-routes';

import type { ProjectBriefItem, ProjectBriefState } from '../lib/build-project-brief';

type ProjectBriefViewProps = {
  projectId: string;
  projectTitle: string;
  projectSummary: string | null;
  brief: ProjectBriefState;
  lastAnsweredLabel: string | null;
  entry: ProjectBriefEntry | null;
};

function readinessParam(brief: ProjectBriefState): string {
  if (brief.kind !== 'brief') return brief.kind;
  return brief.reviewStatus === 'ready' ? 'READY' : 'NOT_READY';
}

function BriefSection({
  title,
  items,
  tone,
  testId,
}: {
  title: string;
  items: ProjectBriefItem[];
  tone: 'confirmed' | 'unconfirmed' | 'conflict';
  testId: string;
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-3" data-testid={testId}>
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={`${item.label}-${item.statusLabel}`} className="flex gap-3 text-sm">
            <span
              aria-hidden
              className={cn(
                'mt-1.5 size-2 shrink-0 rounded-full',
                tone === 'confirmed' && 'bg-primary',
                tone === 'unconfirmed' && 'border border-muted-foreground/60',
                tone === 'conflict' && 'bg-amber-500',
              )}
            />
            <div className="min-w-0">
              <p className="font-medium">{item.label}</p>
              <p className="text-muted-foreground">{item.value ?? item.statusLabel}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ProjectBriefView({
  projectId,
  projectTitle,
  projectSummary,
  brief,
  lastAnsweredLabel,
  entry,
}: ProjectBriefViewProps) {
  const t = useTranslations('projectBrief');
  const canvasHref = buildProjectCanvasUrl(projectId);
  const readiness = readinessParam(brief);

  const viewTracked = useRef(false);
  useEffect(() => {
    if (viewTracked.current) return;
    viewTracked.current = true;
    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.projectBriefViewed, {
      screen: '/workspace/brief',
      project_id: projectId,
      readiness,
      entry: entry ?? 'direct',
      closed_count: brief.kind === 'brief' ? brief.confirmed.length : 0,
      open_count: brief.kind === 'brief' ? brief.unconfirmed.length : 0,
      conflict_count: brief.kind === 'brief' ? brief.conflicts.length : 0,
    });
  }, [brief, entry, projectId, readiness]);

  const onCtaClick = () => {
    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.projectBriefCtaClicked, {
      screen: '/workspace/brief',
      project_id: projectId,
      readiness,
    });
  };

  const judgment =
    brief.kind !== 'brief'
      ? null
      : brief.reviewStatus === 'ready'
        ? t('judgment.ready')
        : brief.blockerLabel
          ? t(
              brief.reviewStatus === 'understanding'
                ? 'judgment.understandingBlocked'
                : 'judgment.validationBlocked',
              { item: brief.blockerLabel },
            )
          : t('judgment.inProgress');

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6 sm:py-10" data-testid="project-brief">
      <Link
        href="/workspace"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t('backToProjects')}
      </Link>

      <header className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{t('eyebrow')}</p>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="project-brief-title">
          {projectTitle}
        </h1>
        {projectSummary ? (
          <p className="text-sm text-muted-foreground">{projectSummary}</p>
        ) : null}
        {brief.kind !== 'empty' ? (
          <p className="text-xs text-muted-foreground" data-testid="project-brief-meta">
            {lastAnsweredLabel
              ? t('metaWithDate', { count: brief.answeredCount, when: lastAnsweredLabel })
              : t('meta', { count: brief.answeredCount })}
          </p>
        ) : null}
      </header>

      {brief.kind === 'brief' ? (
        <>
          <div
            className="rounded-2xl border border-border/70 bg-card p-5"
            data-testid="project-brief-judgment"
            data-review-status={brief.reviewStatus}
          >
            <p className="text-xs font-medium text-muted-foreground">
              {t(`reviewStatus.${brief.reviewStatus}`)}
            </p>
            <p className="mt-2 text-base font-medium leading-relaxed">{judgment}</p>
          </div>

          <div className="space-y-6 rounded-2xl border border-border/70 bg-card p-5">
            <BriefSection
              title={t('sections.confirmed')}
              items={brief.confirmed}
              tone="confirmed"
              testId="project-brief-confirmed"
            />
            <BriefSection
              title={t('sections.conflicts')}
              items={brief.conflicts}
              tone="conflict"
              testId="project-brief-conflicts"
            />
            <BriefSection
              title={t('sections.unconfirmed')}
              items={brief.unconfirmed}
              tone="unconfirmed"
              testId="project-brief-unconfirmed"
            />
          </div>

          {brief.recentUnderstanding || brief.nextQuestion ? (
            <div className="space-y-4 rounded-2xl border border-border/70 bg-card p-5">
              {brief.recentUnderstanding ? (
                <section className="space-y-1" data-testid="project-brief-recent">
                  <h2 className="text-sm font-medium text-muted-foreground">
                    {t('sections.recentUnderstanding')}
                  </h2>
                  <p className="text-sm leading-relaxed">{brief.recentUnderstanding}</p>
                </section>
              ) : null}
              {brief.nextQuestion ? (
                <section className="space-y-1" data-testid="project-brief-next-question">
                  <h2 className="text-sm font-medium text-muted-foreground">
                    {t('sections.nextQuestion')}
                  </h2>
                  <p className="text-sm font-medium leading-relaxed">{brief.nextQuestion}</p>
                  {brief.nextQuestionReason ? (
                    <p className="text-sm text-muted-foreground">{brief.nextQuestionReason}</p>
                  ) : null}
                </section>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <div
          className="rounded-2xl border border-border/70 bg-card p-5"
          data-testid="project-brief-empty"
          data-brief-kind={brief.kind}
        >
          <p className="text-base font-medium">{t(`${brief.kind}.title`)}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t(`${brief.kind}.body`)}</p>
        </div>
      )}

      <Button asChild size="lg" className="h-12 w-full" data-testid="project-brief-cta">
        <Link href={canvasHref} onClick={onCtaClick}>
          {t('cta')}
        </Link>
      </Button>
    </div>
  );
}
