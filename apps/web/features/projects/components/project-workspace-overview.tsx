'use client';

import Link from 'next/link';
import {
  BarChart3,
  Briefcase,
  FileText,
  Landmark,
  MessageSquareQuote,
  Pencil,
  Search,
  ShieldCheck,
  Swords,
  Trash2,
} from 'lucide-react';
import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';

import {
  ActionCenter,
  AiSummaryCard,
  IntelligenceSection,
} from '@/components/intelligence';
import type { ProjectDashboardStats } from '@/features/dashboard/types';
import { buildDashboardInsights } from '@/lib/intelligence/build-dashboard-insights';
import type { StartupProject } from '@repo/types/validation';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui';

import { deleteProject } from '../actions/project-actions';
import { ProjectForm } from './project-form';
import { ProjectStatusBadge } from './project-status-badge';

type ProjectWorkspaceOverviewProps = {
  project: StartupProject;
  stats: ProjectDashboardStats;
};

const MODULES: {
  labelKey: 'nav.research' | 'nav.evidence' | 'nav.voc' | 'nav.competitors' | 'nav.grants' | 'nav.validation' | 'nav.reports' | 'nav.businessPlan';
  icon: typeof Search;
  href: string;
  getCount: (s: ProjectDashboardStats) => number;
}[] = [
  { labelKey: 'nav.research', icon: Search, href: 'research', getCount: (s) => s.research.total },
  { labelKey: 'nav.evidence', icon: FileText, href: 'evidence', getCount: (s) => s.evidence.total },
  { labelKey: 'nav.voc', icon: MessageSquareQuote, href: 'voc', getCount: (s) => s.voc.total },
  { labelKey: 'nav.competitors', icon: Swords, href: 'competitors', getCount: (s) => s.competitors.total },
  { labelKey: 'nav.grants', icon: Landmark, href: 'grants', getCount: (s) => s.grants.total },
  { labelKey: 'nav.validation', icon: ShieldCheck, href: 'validation', getCount: (s) => (s.validationScore ? 1 : 0) },
  { labelKey: 'nav.reports', icon: BarChart3, href: 'reports', getCount: () => 0 },
  { labelKey: 'nav.businessPlan', icon: Briefcase, href: 'business-plan', getCount: () => 0 },
];

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

export function ProjectWorkspaceOverview({ project, stats }: ProjectWorkspaceOverviewProps) {
  const t = useTranslations();
  const insight = buildDashboardInsights(stats);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  const score = stats.validationScore?.totalScore ?? null;

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

  const researchPct = stats.research.progressPercent;
  const evidencePct = Math.min(100, Math.round((stats.evidence.total / 50) * 100));
  const vocPct = Math.min(100, Math.round((stats.voc.total / 20) * 100));

  return (
    <div className="space-y-16 pb-12 motion-safe:animate-in motion-safe:fade-in">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="space-y-3">
          <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t('projectWorkspace.eyebrow')}
          </p>
          <h1 className="text-intelligence-section font-semibold tracking-tight">{project.title}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <ProjectStatusBadge status={project.status} />
            {score !== null ? (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-[13px] font-semibold text-primary">
                {t('intelligence.startupReadiness')}: {score}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard">{t('projectWorkspace.viewDashboard')}</Link>
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
      </header>

      <AiSummaryCard insight={insight} />

      <IntelligenceSection title={t('projectWorkspace.progressTitle')}>
        <div className="ll-consulting-card grid gap-8 lg:grid-cols-3">
          <ProgressBar label={t('nav.research')} percent={researchPct} />
          <ProgressBar label={t('nav.evidence')} percent={evidencePct} />
          <ProgressBar label={t('nav.voc')} percent={vocPct} />
        </div>
      </IntelligenceSection>

      <IntelligenceSection
        title={t('projectWorkspace.modulesTitle')}
        description={t('projectWorkspace.modulesDesc')}
      >
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            const count = mod.getCount(stats);

            return (
              <Link
                key={mod.href}
                href={`/projects/${project.id}/${mod.href}`}
                className="ll-consulting-card-hover group"
              >
                <Icon className="size-5 text-primary opacity-80" />
                <p className="mt-4 text-[18px] font-semibold tracking-tight group-hover:text-primary">
                  {t(mod.labelKey)}
                </p>
                <p className="mt-2 text-3xl font-semibold tabular-nums">{count}</p>
                <p className="mt-3 text-[13px] text-muted-foreground">{t('projectWorkspace.openModule')}</p>
              </Link>
            );
          })}
        </div>
      </IntelligenceSection>

      <IntelligenceSection title={t('intelligence.actionCenter')}>
        <ActionCenter actions={stats.nextActions} />
      </IntelligenceSection>

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
}
