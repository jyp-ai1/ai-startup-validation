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
  const tNav = useTranslations('common.navLinks');
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  const listPath = `/projects/${project.id}/voc`;
  const createdDate = new Date(entry.createdAt).toLocaleDateString('ko-KR');

  function handleDelete() {
    startDelete(async () => {
      await deleteVOC(project.id, entry.id);
    });
  }

  if (isEditing) {
    return (
      <>
        <PageHeader
          title="Edit VOC"
          description={entry.title}
          actions={
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel Edit
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
              Edit
            </Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" />
              Delete
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
          <Link href={`${listPath}/summary`}>Summary Dashboard</Link>
        </Button>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">VOC Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MetaRow label="Source">
            <VOCSourceTypeBadge type={entry.sourceType} />
          </MetaRow>
          <MetaRow label="Customer Segment">
            <VOCCustomerSegmentBadge segment={entry.customerSegment} />
          </MetaRow>
          <MetaRow label="Pain Point">{entry.painPoint}</MetaRow>
          <MetaRow label="Emotion">
            <VOCEmotionBadge emotion={entry.emotion} />
          </MetaRow>
          <MetaRow label="Frequency">
            <VOCFrequencyBadge frequency={entry.frequency} />
          </MetaRow>
          <MetaRow label="Severity">
            <VOCSeverityBadge severity={entry.severity} />
          </MetaRow>
          <MetaRow label="Payment Intent">
            <VOCWillingnessBadge willingness={entry.willingnessToPay} />
          </MetaRow>
          <MetaRow label="Created">{createdDate}</MetaRow>
          <div className="border-t pt-4">
            <p className="mb-2 text-sm font-medium text-muted-foreground">Content</p>
            <p className="whitespace-pre-wrap text-sm">{entry.content}</p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete VOC?</DialogTitle>
            <DialogDescription>
              &quot;{entry.title}&quot; will be permanently deleted. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
