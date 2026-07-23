import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Button, EmptyState, PageHeader } from '@repo/ui';

export default async function ProjectNotFound() {
  const t = await getTranslations('pages');

  return (
    <>
      <PageHeader title={t('projectNotFound')} />
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
