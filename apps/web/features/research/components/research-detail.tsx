'use client';

import { useState, useTransition } from 'react';
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
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  const listPath = `/projects/${project.id}/research`;
  const createdDate = new Date(plan.createdAt).toLocaleDateString('ko-KR');

  function handleDelete() {
    startDelete(async () => {
      await deleteResearchPlan(project.id, plan.id);
    });
  }

  if (isEditing) {
    return (
      <>
        <PageHeader
          title="Edit Research Plan"
          description={plan.title}
          actions={
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel Edit
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
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={listPath}>Back to research plans</Link>
        </Button>
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${project.id}`}>Back to project</Link>
        </Button>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">Research Plan Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MetaRow label="Research Type">
            <ResearchTypeBadge type={plan.researchType} />
            <span className="ml-2 text-muted-foreground">
              ({RESEARCH_TYPE_LABELS[plan.researchType]})
            </span>
          </MetaRow>
          <MetaRow label="Priority">
            <ResearchPriorityBadge priority={plan.priority} />
            <span className="ml-2 text-muted-foreground">
              ({RESEARCH_PRIORITY_LABELS[plan.priority]})
            </span>
          </MetaRow>
          <MetaRow label="Status">
            <ResearchStatusBadge status={plan.status} />
            <span className="ml-2 text-muted-foreground">
              ({RESEARCH_STATUS_LABELS[plan.status]})
            </span>
          </MetaRow>
          <MetaRow label="Created">{createdDate}</MetaRow>
          <div className="border-t pt-4">
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              Description
            </p>
            <p className="whitespace-pre-wrap text-sm">
              {plan.description?.trim() ? plan.description : 'Not provided yet'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete research plan?</DialogTitle>
            <DialogDescription>
              &quot;{plan.title}&quot; will be permanently deleted. This action
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
