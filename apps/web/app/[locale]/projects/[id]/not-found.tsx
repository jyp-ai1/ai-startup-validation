import Link from 'next/link';

import { Button, EmptyState, PageHeader } from '@repo/ui';

export default function ProjectNotFound() {
  return (
    <>
      <PageHeader title="Project Not Found" />
      <div className="mt-8">
        <EmptyState
          title="This project does not exist"
          description="It may have been deleted or the URL is incorrect."
          action={
            <Button asChild>
              <Link href="/projects">Back to Projects</Link>
            </Button>
          }
        />
      </div>
    </>
  );
}
