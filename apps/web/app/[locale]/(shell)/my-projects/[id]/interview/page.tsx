import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import {
  getInterviewPageData,
  InterviewContextPanel,
  InterviewJourneyPanel,
  InterviewWorkspace,
} from '@/features/interview';

export const dynamic = 'force-dynamic';

type InterviewPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: InterviewPageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getInterviewPageData(id);
  const tm = await getTranslations('meta');
  return {
    title: data?.project
      ? `${data.project.title} | ${tm('titleSuffix')}`
      : tm('titleSuffix'),
  };
}

export default async function InterviewPage({ params }: InterviewPageProps) {
  const { id } = await params;
  const data = await getInterviewPageData(id);

  if (!data) {
    notFound();
  }

  const { project, interview } = data;
  if (!interview?.interviewStarted) {
    redirect(`/my-projects/${id}`);
  }

  const completedQuestions = Object.keys(interview.answers).length;
  const contextPanel = (
    <InterviewContextPanel context={interview.context} autoSaved={completedQuestions > 0} />
  );
  const journeyPanel = (
    <InterviewJourneyPanel
      completedQuestions={completedQuestions}
      interviewComplete={interview.interviewComplete}
    />
  );

  return (
    <InterviewWorkspace
      project={project}
      interview={interview}
      contextPanel={contextPanel}
      journeyPanel={journeyPanel}
    />
  );
}
