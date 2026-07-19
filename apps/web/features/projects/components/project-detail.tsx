'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  BookOpen,
  Bot,
  Briefcase,
  ClipboardList,
  Code2,
  Database,
  FileCode,
  FileText,
  Gauge,
  Landmark,
  MessageSquare,
  Pencil,
  Swords,
  Trash2,
} from 'lucide-react';

import type { StartupProject } from '@repo/types/validation';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  PageHeader,
} from '@repo/ui';

import { deleteProject } from '../actions/project-actions';
import { ProjectForm } from './project-form';
import { ProjectStatusBadge } from './project-status-badge';

type ProjectDetailProps = {
  project: StartupProject;
};

function DetailSection({
  title,
  value,
  emptyLabel,
}: {
  title: string;
  value: string | null;
  emptyLabel: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {value?.trim() ? value : emptyLabel}
        </p>
      </CardContent>
    </Card>
  );
}

export function ProjectDetail({ project }: ProjectDetailProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  const createdDate = new Date(project.createdAt).toLocaleDateString(locale);

  function handleDelete() {
    startDelete(async () => {
      await deleteProject(project.id);
    });
  }

  if (isEditing) {
    return (
      <>
        <PageHeader
          title={t('common.edit')}
          description={project.title}
          actions={
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              {t('common.cancel')}
            </Button>
          }
        />
        <div className="mt-8">
          <ProjectForm mode="edit" project={project} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={project.title}
        description={project.summary}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" asChild>
              <Link href={`/projects/${project.id}/research`}>
                <ClipboardList className="size-4" />
                {t('projectDetail.researchPlans')}
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href={`/projects/${project.id}/evidence`}>
                <Database className="size-4" />
                {t('projectDetail.evidence')}
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href={`/projects/${project.id}/knowledge`}>
                <BookOpen className="size-4" />
                {t('projectDetail.knowledge')}
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href={`/projects/${project.id}/agent`}>
                <Bot className="size-4" />
                {t('projectDetail.agent')}
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href={`/projects/${project.id}/competitors`}>
                <Swords className="size-4" />
                {t('projectDetail.competitors')}
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href={`/projects/${project.id}/voc`}>
                <MessageSquare className="size-4" />
                {t('projectDetail.voc')}
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href={`/projects/${project.id}/grants`}>
                <Landmark className="size-4" />
                {t('projectDetail.grants')}
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href={`/projects/${project.id}/validation`}>
                <Gauge className="size-4" />
                {t('projectDetail.validation')}
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href={`/projects/${project.id}/reports`}>
                <FileText className="size-4" />
                {t('projectDetail.reports')}
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href={`/projects/${project.id}/business-plan`}>
                <Briefcase className="size-4" />
                {t('projectDetail.businessPlan')}
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href={`/projects/${project.id}/prd`}>
                <FileCode className="size-4" />
                {t('projectDetail.prd')}
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href={`/projects/${project.id}/development-spec`}>
                <Code2 className="size-4" />
                {t('projectDetail.devSpec')}
              </Link>
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

      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <ProjectStatusBadge status={project.status} />
        <span>
          {t('projects.created')} {createdDate}
        </span>
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href="/projects">{t('projectDetail.backToProjects')}</Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <DetailSection
          title={t('projectDetail.problem')}
          value={project.problem}
          emptyLabel={t('common.notProvided')}
        />
        <DetailSection
          title={t('projectDetail.solution')}
          value={project.solution}
          emptyLabel={t('common.notProvided')}
        />
        <DetailSection
          title={t('projectDetail.targetCustomer')}
          value={project.targetCustomer}
          emptyLabel={t('common.notProvided')}
        />
        <DetailSection
          title={t('projectDetail.businessModel')}
          value={project.businessModel}
          emptyLabel={t('common.notProvided')}
        />
        <DetailSection
          title={t('projectDetail.industry')}
          value={project.industry}
          emptyLabel={t('common.notProvided')}
        />
      </div>

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
    </>
  );
}
