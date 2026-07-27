import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft } from 'lucide-react';

import type { StartupProject } from '@repo/types/validation';
import { Button } from '@repo/ui';

type EmptyProjectWorkspaceProps = {
  project: StartupProject;
};

export async function EmptyProjectWorkspace({ project }: EmptyProjectWorkspaceProps) {
  const t = await getTranslations('myProjects.workspace');

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col justify-center space-y-6 py-8">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4">
          <Link href="/my-projects">
            <ArrowLeft className="mr-1 size-4" aria-hidden />
            {t('backToList')}
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{project.title}</h1>
        <p className="mt-3 text-muted-foreground">{t('emptyTitle')}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t('emptyDesc')}</p>
      </div>
    </div>
  );
}
