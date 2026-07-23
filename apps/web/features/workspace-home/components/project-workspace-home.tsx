'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Bot,
  Clock,
  FileText,
  Landmark,
  MessageSquareQuote,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Swords,
  Trash2,
} from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';

import type { ConsultantViewModel } from '@/features/ai-consultant';
import { ConsultantPanel } from '@/features/ai-consultant';
import type { ProjectDashboardStats } from '@/features/dashboard/types';
import { getValidationHealth } from '@/features/dashboard/types';
import { deleteProject } from '@/features/projects/actions/project-actions';
import { ProjectForm } from '@/features/projects/components/project-form';
import { ProjectStatusBadge } from '@/features/projects/components/project-status-badge';
import { ValidationDecisionBadge } from '@/features/validation/components/validation-decision-badge';
import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import type { StartupProject } from '@repo/types/validation';
import { formatRelativeTime } from '@repo/utils/date';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { WorkspaceHomeViewModel, WorkspaceTabId } from '../types';

type ProjectWorkspaceHomeProps = {
  project: StartupProject;
  stats: ProjectDashboardStats;
  consultant: ConsultantViewModel | null;
  workspaceHome: WorkspaceHomeViewModel;
};

const TAB_IDS: WorkspaceTabId[] = ['overview', 'research', 'decision', 'report', 'activity'];

const KNOWLEDGE_ITEMS = [
  { key: 'research' as const, icon: Search, href: 'research', labelKey: 'knowledge.research' },
  { key: 'evidence' as const, icon: FileText, href: 'evidence', labelKey: 'knowledge.evidence' },
  { key: 'voc' as const, icon: MessageSquareQuote, href: 'voc', labelKey: 'knowledge.voc' },
  { key: 'competitors' as const, icon: Swords, href: 'competitors', labelKey: 'knowledge.competitors' },
  { key: 'grants' as const, icon: Landmark, href: 'grants', labelKey: 'knowledge.grants' },
] as const;

function ProgressBar({ label, percent }: { label: string; percent: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[13px]">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700"
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
    </div>
  );
}

export function ProjectWorkspaceHome({
  project,
  stats,
  consultant,
  workspaceHome,
}: ProjectWorkspaceHomeProps) {
  const t = useTranslations();
  const tw = useTranslations('workspace.home');
  const tc = useTranslations('aiConsultant');
  const td = useTranslations('decision');
  const ts = useTranslations('strategyWorkspace');
  const { trackEvent } = useAnalytics();

  const [activeTab, setActiveTab] = useState<WorkspaceTabId>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  const score = stats.validationScore?.totalScore ?? null;
  const decision = stats.validationScore?.decision ?? null;
  const health = getValidationHealth(stats.validationScore);

  function translateConsultantKey(key: string) {
    if (key.startsWith('actions.')) return td(key as 'actions.voc10.label');
    if (key.startsWith('nextAction.')) return ts(key as 'nextAction.research.label');
    return tc(key as 'recommendations.fallback.voc.label');
  }

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.workspaceOpen, {
      project_id: project.id,
      screen: `/projects/${project.id}`,
      status: workspaceHome.isEmpty ? 'empty' : 'active',
    });
  }, [project.id, trackEvent, workspaceHome.isEmpty]);

  function handleTabChange(tab: WorkspaceTabId) {
    setActiveTab(tab);
    trackEvent(ANALYTICS_EVENTS.workspaceTab, {
      project_id: project.id,
      tab,
    });
  }

  function handleQuickAction(actionId: string, href: string) {
    trackEvent(ANALYTICS_EVENTS.workspaceAction, {
      project_id: project.id,
      action_id: actionId,
    });
  }

  function handleFocusClick(taskId: string) {
    trackEvent(ANALYTICS_EVENTS.workspaceContinue, {
      project_id: project.id,
      task_id: taskId,
    });
  }

  function handleDelete() {
    startDelete(async () => {
      await deleteProject(project.id);
    });
  }

  if (isEditing) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-intelligence-section font-semibold">{t('common.edit')}</h1>
          <Button variant="outline" onClick={() => setIsEditing(false)}>
            {t('common.cancel')}
          </Button>
        </div>
        <ProjectForm mode="edit" project={project} />
      </div>
    );
  }

  const mainContent = (
    <div className="space-y-10 motion-safe:animate-in motion-safe:fade-in">
      {/* Hero */}
      <header className="ll-consulting-card space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              {tw('hero.eyebrow')}
            </p>
            <h1 className="text-intelligence-section font-semibold tracking-tight">{project.title}</h1>
            {project.summary ? (
              <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{project.summary}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <ProjectStatusBadge status={project.status} />
              {decision && decision !== 'DRAFT' ? (
                <ValidationDecisionBadge decision={decision} />
              ) : null}
              {score !== null ? (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-[13px] font-semibold text-primary">
                  {tw('hero.score', { score })}
                </span>
              ) : null}
              <span className="rounded-full bg-muted px-3 py-1 text-[13px] text-muted-foreground">
                {tw('hero.confidence', { percent: workspaceHome.confidencePercent })}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard">{tw('hero.openDashboard')}</Link>
            </Button>
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Pencil className="size-4" />
              {t('common.edit')}
            </Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" />
              {t('common.delete')}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {tw('hero.overallProgress')}
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{workspaceHome.overallProgress}%</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {tw('hero.health')}
            </p>
            <p className="mt-2 text-lg font-semibold">{t(`dashboard.health.${health.label}`)}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {tw('hero.updated')}
            </p>
            <p className="mt-2 flex items-center gap-2 text-[15px] font-medium">
              <Clock className="size-4 text-muted-foreground" />
              {formatRelativeTime(new Date(project.updatedAt))}
            </p>
          </div>
        </div>
      </header>

      {/* Quick Actions */}
      <section>
        <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {tw('quickActions.title')}
        </h2>
        <div className="flex flex-wrap gap-3">
          {workspaceHome.quickActions.map((action) => (
            <Button
              key={action.id}
              variant={action.id === 'runAi' ? 'default' : 'outline'}
              asChild
              onClick={() => handleQuickAction(action.id, action.href)}
            >
              <Link href={action.href}>
                {action.id === 'addResearch' ? <Plus className="size-4" /> : null}
                {action.id === 'runAi' ? <Bot className="size-4" /> : null}
                {action.id === 'decision' ? <ShieldCheck className="size-4" /> : null}
                {action.id === 'report' ? <BarChart3 className="size-4" /> : null}
                {tw(action.labelKey as 'quickActions.addResearch')}
              </Link>
            </Button>
          ))}
        </div>
      </section>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="-mb-px flex flex-wrap gap-1">
          {TAB_IDS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabChange(tab)}
              className={cn(
                'rounded-t-lg px-4 py-2.5 text-[13px] font-medium transition-colors',
                activeTab === tab
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tw(`tabs.${tab}`)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab panels */}
      {activeTab === 'overview' ? (
        <div className="space-y-10">
          {workspaceHome.isEmpty ? (
            <div className="ll-consulting-card flex flex-col items-start gap-4 border-dashed">
              <Sparkles className="size-6 text-primary" />
              <div>
                <h3 className="text-lg font-semibold">{tw('empty.title')}</h3>
                <p className="mt-2 max-w-xl text-[15px] text-muted-foreground">
                  {tw(workspaceHome.emptySuggestionKey as 'empty.suggestion')}
                </p>
              </div>
              <Button asChild>
                <Link href={workspaceHome.emptyCtaHref}>
                  {tw(workspaceHome.emptyCtaLabelKey as 'empty.cta')}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          ) : null}

          {workspaceHome.focusTasks.length > 0 ? (
            <section>
              <h2 className="mb-4 text-lg font-semibold tracking-tight">{tw('focus.title')}</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {workspaceHome.focusTasks.map((task) => (
                  <Link
                    key={task.id}
                    href={task.href}
                    onClick={() => handleFocusClick(task.id)}
                    className="ll-consulting-card-hover group"
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                      {tw('focus.rank', { rank: task.rank })}
                    </span>
                    <p className="mt-3 text-[16px] font-semibold group-hover:text-primary">
                      {translateConsultantKey(task.labelKey)}
                    </p>
                    <p className="mt-2 text-[13px] text-muted-foreground">
                      {translateConsultantKey(task.descriptionKey)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="mb-4 text-lg font-semibold tracking-tight">{tw('progress.title')}</h2>
            <div className="ll-consulting-card space-y-6">
              {workspaceHome.progressSteps.map((step) => (
                <Link key={step.id} href={step.href} className="block">
                  <ProgressBar label={tw(step.labelKey as 'steps.research')} percent={step.percent} />
                </Link>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold tracking-tight">{tw('knowledge.title')}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {KNOWLEDGE_ITEMS.map((item) => {
                const Icon = item.icon;
                const count = workspaceHome.knowledge[item.key];
                return (
                  <Link
                    key={item.key}
                    href={`/projects/${project.id}/${item.href}`}
                    className="ll-consulting-card-hover group text-center"
                  >
                    <Icon className="mx-auto size-5 text-primary opacity-80" />
                    <p className="mt-3 text-[13px] font-medium text-muted-foreground">
                      {tw(item.labelKey as 'knowledge.research')}
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">{count}</p>
                  </Link>
                );
              })}
            </div>
          </section>

          {workspaceHome.recentReports.length > 0 ? (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight">{tw('reports.title')}</h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/projects/${project.id}/reports`}>{tw('reports.viewAll')}</Link>
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {workspaceHome.recentReports.slice(0, 3).map((report) => (
                  <Link key={report.id} href={report.href} className="ll-consulting-card-hover">
                    <p className="font-semibold">{report.title}</p>
                    <p className="mt-2 text-[13px] text-muted-foreground">
                      {tw(report.formatKey as 'reportFormat.draft')} ·{' '}
                      {formatRelativeTime(new Date(report.updatedAt))}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'research' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {KNOWLEDGE_ITEMS.filter((item) => item.key !== 'grants').map((item) => {
            const Icon = item.icon;
            const count = workspaceHome.knowledge[item.key];
            return (
              <Link
                key={item.key}
                href={`/projects/${project.id}/${item.href}`}
                className="ll-consulting-card-hover flex items-center gap-4"
              >
                <Icon className="size-6 text-primary" />
                <div>
                  <p className="font-semibold">{tw(item.labelKey as 'knowledge.research')}</p>
                  <p className="text-[13px] text-muted-foreground">{tw('researchTab.count', { count })}</p>
                </div>
              </Link>
            );
          })}
          <Link
            href={`/projects/${project.id}/agent`}
            className="ll-consulting-card-hover flex items-center gap-4 border-primary/20 bg-primary/5"
          >
            <Bot className="size-6 text-primary" />
            <div>
              <p className="font-semibold">{tw('researchTab.runAi')}</p>
              <p className="text-[13px] text-muted-foreground">{tw('researchTab.runAiDesc')}</p>
            </div>
          </Link>
        </div>
      ) : null}

      {activeTab === 'decision' ? (
        <div className="ll-consulting-card space-y-4">
          {decision && decision !== 'DRAFT' ? (
            <>
              <ValidationDecisionBadge decision={decision} />
              {score !== null ? (
                <p className="text-muted-foreground">{tw('decisionTab.score', { score })}</p>
              ) : null}
            </>
          ) : (
            <p className="text-muted-foreground">{tw('decisionTab.pending')}</p>
          )}
          <Button asChild>
            <Link href={`/projects/${project.id}/decision`}>{tw('decisionTab.open')}</Link>
          </Button>
        </div>
      ) : null}

      {activeTab === 'report' ? (
        <div className="space-y-4">
          {workspaceHome.recentReports.length === 0 ? (
            <div className="ll-consulting-card text-center">
              <p className="text-muted-foreground">{tw('reports.empty')}</p>
              <Button className="mt-4" asChild>
                <Link href={`/projects/${project.id}/reports/new`}>{tw('reports.create')}</Link>
              </Button>
            </div>
          ) : (
            workspaceHome.recentReports.map((report) => (
              <Link key={report.id} href={report.href} className="ll-consulting-card-hover block">
                <p className="font-semibold">{report.title}</p>
                <p className="mt-2 text-[13px] text-muted-foreground">
                  {tw(report.formatKey as 'reportFormat.draft')} ·{' '}
                  {formatRelativeTime(new Date(report.updatedAt))}
                </p>
              </Link>
            ))
          )}
        </div>
      ) : null}

      {activeTab === 'activity' ? (
        <div className="space-y-3">
          {stats.recentActivity.length === 0 ? (
            <p className="text-muted-foreground">{tw('activity.empty')}</p>
          ) : (
            stats.recentActivity.map((item) => (
              <div key={item.id} className="ll-consulting-card flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-[13px] text-muted-foreground">{item.type}</p>
                </div>
                <span className="shrink-0 text-[13px] text-muted-foreground">
                  {formatRelativeTime(new Date(item.occurredAt))}
                </span>
              </div>
            ))
          )}
        </div>
      ) : null}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('projects.deleteConfirm')}</DialogTitle>
            <DialogDescription>
              &quot;{project.title}&quot; — {t('projects.deleteWarning')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? t('common.processing') : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (!consultant) {
    return <div className="pb-12">{mainContent}</div>;
  }

  return (
    <div className="mx-auto max-w-7xl pb-20">
      <div className="grid gap-8 xl:grid-cols-[1fr_minmax(320px,380px)]">
        <div className="min-w-0">{mainContent}</div>
        <div className="xl:sticky xl:top-24 xl:self-start">
          <ConsultantPanel consultant={consultant} />
        </div>
      </div>
    </div>
  );
}
