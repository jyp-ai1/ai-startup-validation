'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';

import type { ResearchPlan, StartupProject } from '@repo/types/validation';
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

import { useLocalizedFormatters } from '@/lib/i18n/use-localized-formatters';

import { deleteResearchPlan } from '../actions/research-actions';
import {
  RESEARCH_PRIORITY_LABELS,
  RESEARCH_STATUS_LABELS,
  RESEARCH_TYPE_LABELS,
} from '../schemas/research-schema';
import {
  ResearchPriorityBadge,
  ResearchStatusBadge,
  ResearchTypeBadge,
} from './research-badges';
import { ResearchForm } from './research-form';

type ResearchDetailProps = {
  project: StartupProject;
  plan: ResearchPlan;
};

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
      <span className="w-32 shrink-0 text-sm font-medium text-muted-foreground">
        {label}
      </span>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export function ResearchDetail({ project, plan }: ResearchDetailProps) {
  const t = useTranslations('research');
  const tCommon = useTranslations('common');
  const tNav = useTranslations('common.navLinks');
  const { formatDate } = useLocalizedFormatters();
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  const listPath = `/projects/${project.id}/research`;
  const createdDate = formatDate(new Date(plan.createdAt));

  function handleDelete() {
    startDelete(async () => {
      await deleteResearchPlan(project.id, plan.id);
    });
  }

  if (isEditing) {
    return (
      <>
        <PageHeader
          title={t('editTitle')}
          description={plan.title}
          actions={
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              {tCommon('cancelEdit')}
            </Button>
          }
        />
        <div className="mt-8">
          <ResearchForm mode="edit" projectId={project.id} plan={plan} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={plan.title}
        description={project.title}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Pencil className="size-4" />
              {tCommon('edit')}
            </Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" />
              {tCommon('delete')}
            </Button>
          </div>
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={listPath}>{tNav('backToResearch')}</Link>
        </Button>
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${project.id}`}>{tNav('backToProject')}</Link>
        </Button>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">{t('detailsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MetaRow label={tCommon('fields.researchType')}>
            <ResearchTypeBadge type={plan.researchType} />
            <span className="ml-2 text-muted-foreground">
              ({RESEARCH_TYPE_LABELS[plan.researchType]})
            </span>
          </MetaRow>
          <MetaRow label={tCommon('fields.priority')}>
            <ResearchPriorityBadge priority={plan.priority} />
            <span className="ml-2 text-muted-foreground">
              ({RESEARCH_PRIORITY_LABELS[plan.priority]})
            </span>
          </MetaRow>
          <MetaRow label={tCommon('fields.status')}>
            <ResearchStatusBadge status={plan.status} />
            <span className="ml-2 text-muted-foreground">
              ({RESEARCH_STATUS_LABELS[plan.status]})
            </span>
          </MetaRow>
          <MetaRow label={tCommon('fields.created')}>{createdDate}</MetaRow>
          <div className="border-t pt-4">
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              {tCommon('fields.description')}
            </p>
            <p className="whitespace-pre-wrap text-sm">
              {plan.description?.trim() ? plan.description : tCommon('notProvided')}
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteConfirm')}</DialogTitle>
            <DialogDescription>{t('deleteConfirmDesc', { title: plan.title })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? tCommon('processing') : tCommon('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
