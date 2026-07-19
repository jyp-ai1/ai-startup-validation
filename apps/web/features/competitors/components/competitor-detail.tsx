'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';

import type { Competitor, StartupProject } from '@repo/types/validation';
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

import { deleteCompetitor } from '../actions/competitor-actions';
import {
  CompetitorCategoryBadge,
  CompetitorMarketPositionBadge,
} from './competitor-badges';
import { CompetitorForm } from './competitor-form';

type CompetitorDetailProps = {
  project: StartupProject;
  competitor: Competitor;
};

function DetailSection({
  title,
  value,
}: {
  title: string;
  value: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {value?.trim() ? value : 'Not provided yet'}
        </p>
      </CardContent>
    </Card>
  );
}

export function CompetitorDetail({ project, competitor }: CompetitorDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  const listPath = `/projects/${project.id}/competitors`;

  function handleDelete() {
    startDelete(async () => {
      await deleteCompetitor(project.id, competitor.id);
    });
  }

  if (isEditing) {
    return (
      <>
        <PageHeader
          title="Edit Competitor"
          description={competitor.name}
          actions={
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel Edit
            </Button>
          }
        />
        <div className="mt-8">
          <CompetitorForm
            mode="edit"
            projectId={project.id}
            competitor={competitor}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={competitor.name}
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
        <CompetitorCategoryBadge category={competitor.category} />
        <CompetitorMarketPositionBadge position={competitor.marketPosition} />
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={listPath}>Back to competitors</Link>
        </Button>
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`${listPath}/compare`}>Compare Matrix</Link>
        </Button>
      </div>

      {competitor.website ? (
        <div className="mt-4">
          <a
            href={competitor.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            {competitor.website}
            <ExternalLink className="size-3.5" />
          </a>
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <DetailSection title="Company Overview" value={competitor.description} />
        <DetailSection title="Customer" value={competitor.targetCustomer} />
        <DetailSection title="Business Model" value={competitor.businessModel} />
        <DetailSection title="Pricing" value={competitor.pricing} />
        <DetailSection title="Strength" value={competitor.strengths} />
        <DetailSection title="Weakness" value={competitor.weaknesses} />
        <DetailSection
          title="Differentiation"
          value={competitor.differentiation}
        />
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete competitor?</DialogTitle>
            <DialogDescription>
              &quot;{competitor.name}&quot; will be permanently deleted. This action
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
