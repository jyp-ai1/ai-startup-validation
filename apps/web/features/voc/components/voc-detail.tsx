'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';

import type { StartupProject, VOC } from '@repo/types/validation';
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

import { deleteVOC } from '../actions/voc-actions';
import {
  VOCCustomerSegmentBadge,
  VOCEmotionBadge,
  VOCFrequencyBadge,
  VOCSeverityBadge,
  VOCSourceTypeBadge,
  VOCWillingnessBadge,
} from './voc-badges';
import { VOCForm } from './voc-form';

type VOCDetailProps = {
  project: StartupProject;
  entry: VOC;
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

export function VOCDetail({ project, entry }: VOCDetailProps) {
  const t = useTranslations('voc');
  const tCommon = useTranslations('common');
  const tNav = useTranslations('common.navLinks');
  const { formatDate } = useLocalizedFormatters();
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  const listPath = `/projects/${project.id}/voc`;
  const createdDate = formatDate(new Date(entry.createdAt));

  function handleDelete() {
    startDelete(async () => {
      await deleteVOC(project.id, entry.id);
    });
  }

  if (isEditing) {
    return (
      <>
        <PageHeader
          title={t('editTitle')}
          description={entry.title}
          actions={
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              {tCommon('cancelEdit')}
            </Button>
          }
        />
        <div className="mt-8">
          <VOCForm mode="edit" projectId={project.id} entry={entry} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={entry.title}
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
        <VOCCustomerSegmentBadge segment={entry.customerSegment} />
        <VOCEmotionBadge emotion={entry.emotion} />
        <VOCFrequencyBadge frequency={entry.frequency} />
        <VOCSeverityBadge severity={entry.severity} />
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={listPath}>{tNav('backToVocList')}</Link>
        </Button>
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`${listPath}/summary`}>{t('summaryDashboardLink')}</Link>
        </Button>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">{t('detailsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MetaRow label={tCommon('fields.source')}>
            <VOCSourceTypeBadge type={entry.sourceType} />
          </MetaRow>
          <MetaRow label={tCommon('fields.customerSegment')}>
            <VOCCustomerSegmentBadge segment={entry.customerSegment} />
          </MetaRow>
          <MetaRow label={tCommon('fields.painPoint')}>{entry.painPoint}</MetaRow>
          <MetaRow label={tCommon('fields.emotion')}>
            <VOCEmotionBadge emotion={entry.emotion} />
          </MetaRow>
          <MetaRow label={tCommon('fields.frequency')}>
            <VOCFrequencyBadge frequency={entry.frequency} />
          </MetaRow>
          <MetaRow label={tCommon('fields.severity')}>
            <VOCSeverityBadge severity={entry.severity} />
          </MetaRow>
          <MetaRow label={tCommon('fields.paymentIntent')}>
            <VOCWillingnessBadge willingness={entry.willingnessToPay} />
          </MetaRow>
          <MetaRow label={tCommon('fields.created')}>{createdDate}</MetaRow>
          <div className="border-t pt-4">
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              {tCommon('fields.content')}
            </p>
            <p className="whitespace-pre-wrap text-sm">{entry.content}</p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteConfirm')}</DialogTitle>
            <DialogDescription>{t('deleteConfirmDesc', { title: entry.title })}</DialogDescription>
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
