import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft } from 'lucide-react';

import type { StartupProject } from '@repo/types/validation';
import { Button } from '@repo/ui';

import { startInterviewAction } from '../actions/interview-actions';
import { parseInterviewBundle } from '../types/interview-state';

type GuidedInterviewEntryProps = {
  project: StartupProject;
};

export async function GuidedInterviewEntry({ project }: GuidedInterviewEntryProps) {
  const t = await getTranslations('interview.entry');
  const interview = parseInterviewBundle(project.onboardingContext).sprint12;
  const started = interview?.interviewStarted ?? false;
  const complete = interview?.interviewComplete ?? false;

  return (
    <div className="mx-auto flex min-h-[55vh] max-w-xl flex-col justify-center space-y-8 py-10">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-6">
          <Link href="/my-projects">
            <ArrowLeft className="mr-1 size-4" aria-hidden />
            {t('backToList')}
          </Link>
        </Button>
        <p className="text-sm font-medium text-muted-foreground">{project.title}</p>
        <h1 className="mt-3 text-2xl font-semibold leading-snug tracking-tight">{t('title')}</h1>
        <p className="mt-4 text-muted-foreground">{t('duration')}</p>
        <p className="mt-6 text-base leading-relaxed text-foreground/90">{t('promise')}</p>
      </div>

      {complete ? (
        <Button asChild size="lg" className="h-12 w-fit rounded-xl px-8">
          <Link href={`/my-projects/${project.id}/interview`}>{t('viewResult')}</Link>
        </Button>
      ) : started ? (
        <Button asChild size="lg" className="h-12 w-fit rounded-xl px-8">
          <Link href={`/my-projects/${project.id}/interview`}>{t('continueCta')}</Link>
        </Button>
      ) : (
        <form action={startInterviewAction.bind(null, project.id)}>
          <Button type="submit" size="lg" className="h-12 rounded-xl px-8">
            {t('startCta')}
          </Button>
        </form>
      )}
    </div>
  );
}
