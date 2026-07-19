'use client';

import { useState, useTransition } from 'react';
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
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  const listPath = `/projects/${project.id}/grants`;
  const deadlineLabel = grant.deadline
    ? new Date(grant.deadline).toLocaleDateString('ko-KR')
    : 'Not set';

  function handleDelete() {
    startDelete(async () => {
      await deleteGrant(project.id, grant.id);
    });
  }

  if (isEditing) {
    return (
      <>
        <PageHeader
          title="Edit Grant"
          description={grant.name}
          actions={
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel Edit
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
        <GrantStatusBadge status={grant.status} />
        <GrantFitScoreBadge score={grant.fitScore} />
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={listPath}>Back to grants</Link>
        </Button>
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`${listPath}/dashboard`}>Dashboard</Link>
        </Button>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">Grant Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MetaRow label="Organization">{grant.organization}</MetaRow>
          <MetaRow label="Category">
            <GrantCategoryBadge category={grant.category} />
          </MetaRow>
          <MetaRow label="Target Stage">
            <GrantTargetStageBadge stage={grant.targetStage} />
          </MetaRow>
          <MetaRow label="Support Type">
            <GrantSupportTypeBadge type={grant.supportType} />
          </MetaRow>
          <MetaRow label="Amount">
            {grant.amount?.trim() ? grant.amount : 'Not provided'}
          </MetaRow>
          <MetaRow label="Deadline">{deadlineLabel}</MetaRow>
          <MetaRow label="Fit Score">
            <GrantFitScoreBadge score={grant.fitScore} />
          </MetaRow>
          {grant.applicationUrl ? (
            <MetaRow label="Application">
              <a
                href={grant.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Apply
                <ExternalLink className="size-3.5" />
              </a>
            </MetaRow>
          ) : null}
          <div className="border-t pt-4">
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              Description
            </p>
            <p className="whitespace-pre-wrap text-sm">
              {grant.description?.trim() ? grant.description : 'Not provided yet'}
            </p>
          </div>
          <div className="border-t pt-4">
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              Eligibility
            </p>
            <p className="whitespace-pre-wrap text-sm">
              {grant.eligibility?.trim() ? grant.eligibility : 'Not provided yet'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete grant?</DialogTitle>
            <DialogDescription>
              &quot;{grant.name}&quot; will be permanently deleted. This action
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
