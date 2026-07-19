export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';

import { ProjectForm } from '@/features/projects';
import { PageHeader } from '@repo/ui';

export const metadata: Metadata = {
  title: 'New Project | AI Startup Validation Framework',
};

export default function NewProjectPage() {
  return (
    <>
      <PageHeader
        title="New Startup Project"
        description="Register a startup idea to begin validation."
      />
      <div className="mt-8 max-w-3xl">
        <ProjectForm mode="create" />
      </div>
    </>
  );
}
