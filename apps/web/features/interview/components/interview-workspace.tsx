'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';

import type { StartupProject } from '@repo/types/validation';
import { Button } from '@repo/ui';

import { MOCK_INTERVIEW_QUESTIONS } from '../constants/mock-questions';
import type { Sprint12InterviewState } from '../types/interview-state';
import { InterviewDecisionPlaceholder } from './interview-decision-placeholder';
import { InterviewQuestionView } from './interview-question-view';

type InterviewWorkspaceProps = {
  project: StartupProject;
  interview: Sprint12InterviewState;
  contextPanel: React.ReactNode;
  journeyPanel: React.ReactNode;
};

export function InterviewWorkspace({
  project,
  interview,
  contextPanel,
  journeyPanel,
}: InterviewWorkspaceProps) {
  const t = useTranslations('interview.workspace');
  const router = useRouter();
  const completedQuestions = Object.keys(interview.answers).length;
  const currentQuestion = MOCK_INTERVIEW_QUESTIONS[interview.currentQuestionIndex];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href={`/my-projects/${project.id}`}>
            <ArrowLeft className="mr-1 size-4" aria-hidden />
            {t('backToProject')}
          </Link>
        </Button>
        <p className="truncate text-sm text-muted-foreground">{project.title}</p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)_11rem] lg:gap-12">
        <div className="order-2 lg:order-1">{contextPanel}</div>

        <main className="order-1 min-w-0 lg:order-2">
          {interview.interviewComplete || !currentQuestion ? (
            <InterviewDecisionPlaceholder />
          ) : (
            <InterviewQuestionView
              projectId={project.id}
              questionId={currentQuestion.id}
              stepLabel={currentQuestion.stepLabel}
              questionText={currentQuestion.text}
              initialAnswer={interview.answers[currentQuestion.id] ?? ''}
              onComplete={() => router.refresh()}
              onAnswered={() => router.refresh()}
            />
          )}
        </main>

        <div className="order-3">{journeyPanel}</div>
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground lg:hidden">
        {t('mobileJourneyHint', { completed: completedQuestions })}
      </p>
    </div>
  );
}
