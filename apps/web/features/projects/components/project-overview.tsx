'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Pencil, Trash2 } from 'lucide-react';

import type { ProjectDashboardStats } from '@/features/dashboard/types';
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

import { DashboardPanels } from '@/features/dashboard/components/dashboard-panels';
import { KpiMetricsRow } from '@/features/dashboard/components/dashboard-panels';
import { ValidationScoreHero } from '@/features/dashboard/components/validation-score-hero';
import {
  WorkspaceHeader,
  WorkspacePanel,
  WorkspaceProjectMeta,
} from '@/components/workspace';
import { deleteProject } from '../actions/project-actions';
import { ProjectForm } from './project-form';

type ProjectOverviewProps = {
  project: StartupProject;
  stats: ProjectDashboardStats;
};

export function ProjectOverview({ project, stats }: ProjectOverviewProps) {
  const t = useTranslations();
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  function handleDelete() {
    startDelete(async () => {
      await deleteProject(project.id);
    });
  }

  if (isEditing) {
    return (
      <>
        <WorkspaceHeader
          eyebrow={t('workspace.sections.workspace')}
          title={t('common.edit')}
          description={project.title}
          actions={
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              {t('common.cancel')}
            </Button>
          }
        />
        <ProjectForm mode="edit" project={project} />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        eyebrow={t('workspace.sections.workspace')}
        title={t('projectDetail.overviewTitle')}
        description={project.summary}
        meta={<WorkspaceProjectMeta project={project} />}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={`/projects/${project.id}/studio`}>{t('nav.aiStudio')}</Link>
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
        }
      />

      <ValidationScoreHero stats={stats} />
      <KpiMetricsRow stats={stats} />

      <div className="grid gap-4 lg:grid-cols-2">
        <WorkspacePanel title={t('projectDetail.problem')}>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {project.problem?.trim() || t('common.notProvided')}
          </p>
        </WorkspacePanel>
        <WorkspacePanel title={t('projectDetail.solution')}>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {project.solution?.trim() || t('common.notProvided')}
          </p>
        </WorkspacePanel>
        <WorkspacePanel title={t('projectDetail.targetCustomer')}>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {project.targetCustomer?.trim() || t('common.notProvided')}
          </p>
        </WorkspacePanel>
        <WorkspacePanel title={t('projectDetail.businessModel')}>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {project.businessModel?.trim() || t('common.notProvided')}
          </p>
        </WorkspacePanel>
      </div>

      <DashboardPanels stats={stats} />

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
