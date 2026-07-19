'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Eye, Trash2 } from 'lucide-react';

import type { BusinessPlanWithSections, StartupProject } from '@repo/types/validation';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  PageHeader,
} from '@repo/ui';

import { renderMarkdown } from '@/features/reports/utils/markdown';

import { deleteBusinessPlan } from '../actions/business-plan-actions';
import { BusinessPlanGenerateButton } from './business-plan-generate-button';
import { BusinessPlanSectionItem } from './business-plan-section-item';
import { BusinessPlanStatusBadge } from './business-plan-status-badge';

type BusinessPlanDetailProps = {
  project: StartupProject;
  plan: BusinessPlanWithSections;
};

export function BusinessPlanDetail({ project, plan }: BusinessPlanDetailProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  const basePath = `/projects/${project.id}/business-plan/${plan.id}`;

  function handleDelete() {
    startDelete(async () => {
      await deleteBusinessPlan(project.id, plan.id);
    });
  }

  return (
    <>
      <PageHeader
        title={plan.title}
        description={project.title}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <BusinessPlanGenerateButton
              projectId={project.id}
              planId={plan.id}
              label="Regenerate"
            />
            <Button variant="outline" asChild>
              <Link href={`${basePath}/preview`}>
                <Eye className="size-4" />
                Preview
              </Link>
            </Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <BusinessPlanStatusBadge status={plan.status} />
        <span className="text-sm text-muted-foreground">{plan.sections.length} sections</span>
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${project.id}/business-plan`}>Back to list</Link>
        </Button>
      </div>

      {plan.summary ? (
        <div
          className="prose prose-sm dark:prose-invert mt-4 max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(plan.summary) }}
        />
      ) : null}

      <div className="mt-8 space-y-4">
        {plan.sections.map((section) => (
          <BusinessPlanSectionItem
            key={section.id}
            projectId={project.id}
            planId={plan.id}
            section={section}
          />
        ))}
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete business plan?</DialogTitle>
            <DialogDescription>
              &quot;{plan.title}&quot; will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
