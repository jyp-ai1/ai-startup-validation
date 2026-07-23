'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';

import type { GovernmentGrant, StartupProject } from '@repo/types/validation';
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

import { deleteGrant } from '../actions/grant-actions';
import {
  GrantCategoryBadge,
  GrantFitScoreBadge,
  GrantStatusBadge,
  GrantSupportTypeBadge,
  GrantTargetStageBadge,
} from './grant-badges';
import { GrantForm } from './grant-form';

type GrantDetailProps = {
  project: StartupProject;
  grant: GovernmentGrant;
};

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-4">
      <span className="w-36 shrink-0 text-sm font-medium text-muted-foreground">
        {label}
      </span>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export function GrantDetail({ project, grant }: GrantDetailProps) {
  const t = useTranslations('grants');
  const tCommon = useTranslations('common');
  const tNav = useTranslations('common.navLinks');
  const { formatDate } = useLocalizedFormatters();
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  const listPath = `/projects/${project.id}/grants`;
  const deadlineLabel = grant.deadline
    ? formatDate(new Date(grant.deadline))
    : tCommon('notSet');

  function handleDelete() {
    startDelete(async () => {
      await deleteGrant(project.id, grant.id);
    });
  }

  if (isEditing) {
    return (
      <>
        <PageHeader
          title={t('editTitle')}
          description={grant.name}
          actions={
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              {tCommon('cancelEdit')}
            </Button>
          }
        />
        <div className="mt-8">
          <GrantForm mode="edit" projectId={project.id} grant={grant} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={grant.name}
        description={grant.organization}
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
        <GrantStatusBadge status={grant.status} />
        <GrantFitScoreBadge score={grant.fitScore} />
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={listPath}>{tNav('backToGrants')}</Link>
        </Button>
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`${listPath}/dashboard`}>{tCommon('dashboard')}</Link>
        </Button>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">{t('detailsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MetaRow label={tCommon('fields.organization')}>{grant.organization}</MetaRow>
          <MetaRow label={tCommon('fields.category')}>
            <GrantCategoryBadge category={grant.category} />
          </MetaRow>
          <MetaRow label={tCommon('fields.targetStage')}>
            <GrantTargetStageBadge stage={grant.targetStage} />
          </MetaRow>
          <MetaRow label={tCommon('fields.supportType')}>
            <GrantSupportTypeBadge type={grant.supportType} />
          </MetaRow>
          <MetaRow label={tCommon('fields.amount')}>
            {grant.amount?.trim() ? grant.amount : tCommon('notProvided')}
          </MetaRow>
          <MetaRow label={tCommon('fields.deadline')}>{deadlineLabel}</MetaRow>
          <MetaRow label={tCommon('fields.fitScore')}>
            <GrantFitScoreBadge score={grant.fitScore} />
          </MetaRow>
          {grant.applicationUrl ? (
            <MetaRow label={tCommon('fields.application')}>
              <a
                href={grant.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                {tCommon('apply')}
                <ExternalLink className="size-3.5" />
              </a>
            </MetaRow>
          ) : null}
          <div className="border-t pt-4">
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              {tCommon('fields.description')}
            </p>
            <p className="whitespace-pre-wrap text-sm">
              {grant.description?.trim() ? grant.description : tCommon('notProvided')}
            </p>
          </div>
          <div className="border-t pt-4">
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              {tCommon('fields.eligibility')}
            </p>
            <p className="whitespace-pre-wrap text-sm">
              {grant.eligibility?.trim() ? grant.eligibility : tCommon('notProvided')}
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteConfirm')}</DialogTitle>
            <DialogDescription>{t('deleteConfirmDesc', { title: grant.name })}</DialogDescription>
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
