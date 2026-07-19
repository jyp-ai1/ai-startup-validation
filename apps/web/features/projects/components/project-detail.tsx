'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';

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

export function ProjectDetail({ project }: ProjectDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  const createdDate = new Date(project.createdAt).toLocaleDateString('ko-KR');

  function handleDelete() {
    startDelete(async () => {
      await deleteProject(project.id);
    });
  }

  if (isEditing) {
    return (
      <>
        <PageHeader
          title="Edit Project"
          description={project.title}
          actions={
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel Edit
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

      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <ProjectStatusBadge status={project.status} />
        <span>Created {createdDate}</span>
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href="/projects">Back to projects</Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <DetailSection title="Problem" value={project.problem} />
        <DetailSection title="Solution" value={project.solution} />
        <DetailSection title="Target Customer" value={project.targetCustomer} />
        <DetailSection title="Business Model" value={project.businessModel} />
        <DetailSection title="Industry" value={project.industry} />
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              &quot;{project.title}&quot; will be permanently deleted. This action
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
