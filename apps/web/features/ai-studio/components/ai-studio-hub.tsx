'use client';

import Link from 'next/link';
import { CheckCircle2, Circle, Loader2, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { IntelligencePage } from '@/components/intelligence';
import { buildAiStudioInsights } from '@/lib/intelligence/build-feature-insights';
import type { StartupProject } from '@repo/types/validation';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

type DocPipelineStatus = 'empty' | 'ready' | 'generating' | 'completed';

type AiStudioHubProps = {
  project: StartupProject;
  counts: {
    reports: number;
    businessPlans: number;
    prds: number;
    devSpecs: number;
  };
  statuses: {
    report: DocPipelineStatus;
    businessPlan: DocPipelineStatus;
    prd: DocPipelineStatus;
    devSpec: DocPipelineStatus;
  };
};

type StudioItem = {
  key: string;
  titleKey: string;
  descKey: string;
  href: string;
  newHref: string;
  count: number;
  status: DocPipelineStatus;
};

const STATUS_STYLE: Record<
  DocPipelineStatus,
  { icon: typeof CheckCircle2; className: string; labelKey: string }
> = {
  empty: {
    icon: Circle,
    className: 'text-muted-foreground',
    labelKey: 'aiStudio.status.generate',
  },
  ready: {
    icon: Circle,
    className: 'text-muted-foreground',
    labelKey: 'aiStudio.status.ready',
  },
  generating: {
    icon: Loader2,
    className: 'animate-spin text-amber-600',
    labelKey: 'aiStudio.status.generating',
  },
  completed: {
    icon: CheckCircle2,
    className: 'text-emerald-600',
    labelKey: 'aiStudio.status.completed',
  },
};

export function AiStudioHub({ project, counts, statuses }: AiStudioHubProps) {
  const t = useTranslations();
  const base = `/projects/${project.id}`;
  const insight = buildAiStudioInsights(counts);

  const items: StudioItem[] = [
    {
      key: 'report',
      titleKey: 'aiStudio.items.report',
      descKey: 'aiStudio.items.reportDesc',
      href: `${base}/reports`,
      newHref: `${base}/reports/new`,
      count: counts.reports,
      status: statuses.report,
    },
    {
      key: 'businessPlan',
      titleKey: 'aiStudio.items.businessPlan',
      descKey: 'aiStudio.items.businessPlanDesc',
      href: `${base}/business-plan`,
      newHref: `${base}/business-plan/new`,
      count: counts.businessPlans,
      status: statuses.businessPlan,
    },
    {
      key: 'prd',
      titleKey: 'aiStudio.items.prd',
      descKey: 'aiStudio.items.prdDesc',
      href: `${base}/prd`,
      newHref: `${base}/prd/new`,
      count: counts.prds,
      status: statuses.prd,
    },
    {
      key: 'devSpec',
      titleKey: 'aiStudio.items.devSpec',
      descKey: 'aiStudio.items.devSpecDesc',
      href: `${base}/development-spec`,
      newHref: `${base}/development-spec/new`,
      count: counts.devSpecs,
      status: statuses.devSpec,
    },
  ];

  return (
    <IntelligencePage
      eyebrow={t('workspace.sections.aiStudio')}
      title={t('aiStudio.title')}
      description={t('aiStudio.description', { project: project.title })}
      insight={insight}
      dataSectionTitle={t('aiStudio.workspaceTitle')}
      actions={
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-[13px] font-medium text-primary">
          <Sparkles className="size-4" />
          {t('aiStudio.badge')}
        </span>
      }
    >
      <div className="grid gap-6 md:grid-cols-2">
        {items.map((item) => {
          const style = STATUS_STYLE[item.status];
          const Icon = style.icon;

          return (
            <article key={item.key} className="ll-consulting-card-hover flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-[18px] font-semibold tracking-tight">{t(item.titleKey)}</h3>
                  <span className="text-[13px] tabular-nums text-muted-foreground">
                    {t('aiStudio.docCount', { count: item.count })}
                  </span>
                </div>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{t(item.descKey)}</p>
                <div className="mt-6 flex items-center gap-2">
                  <Icon className={cn('size-5', style.className)} />
                  <span className={cn('text-sm font-medium', style.className)}>{t(style.labelKey)}</span>
                </div>
              </div>
              <div className="mt-8 flex flex-wrap gap-2 border-t border-border/50 pt-6">
                <Button variant="outline" size="sm" asChild>
                  <Link href={item.href}>{t('aiStudio.open')}</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href={item.newHref}>
                    {item.status === 'completed' ? t('aiStudio.regenerate') : t('aiStudio.generate')}
                  </Link>
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </IntelligencePage>
  );
}
