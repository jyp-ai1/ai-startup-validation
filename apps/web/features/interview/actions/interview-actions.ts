'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { isSupabaseConfigured } from '@repo/db';

import {
  assertProjectOwner,
  getOwnedProject,
} from '@/features/projects/services/project-service';
import { getStartupProjectRepository } from '@/lib/db/platform';
import { requireAuthUser } from '@/lib/auth/server-auth';

import {
  INTERVIEW_QUESTION_IDS,
  type InterviewQuestionId,
  buildInitialInterviewState,
  parseInterviewBundle,
  type Sprint12InterviewState,
} from '../types/interview-state';

function mergeOnboarding(
  existing: Record<string, unknown> | null | undefined,
  sprint12: Sprint12InterviewState,
): Record<string, unknown> {
  return {
    ...(existing ?? {}),
    sprint12,
  };
}

async function saveInterviewState(
  userId: string,
  projectId: string,
  sprint12: Sprint12InterviewState,
): Promise<void> {
  const project = await assertProjectOwner(userId, projectId);
  const repo = getStartupProjectRepository();
  await repo.update(projectId, {
    onboardingContext: mergeOnboarding(project.onboardingContext, sprint12),
    status: sprint12.interviewComplete ? 'RESEARCHING' : project.status,
  });
  revalidatePath(`/my-projects/${projectId}`);
  revalidatePath(`/my-projects/${projectId}/interview`);
}

export async function startInterviewAction(projectId: string): Promise<void> {
  const user = await requireAuthUser('/my-projects');
  if (!isSupabaseConfigured()) return;

  const project = await assertProjectOwner(user.id, projectId);
  const bundle = parseInterviewBundle(project.onboardingContext);
  const base =
    bundle.sprint12 ??
    buildInitialInterviewState('startup-idea');

  await saveInterviewState(user.id, projectId, {
    ...base,
    interviewStarted: true,
    currentQuestionIndex: 0,
  });

  redirect(`/my-projects/${projectId}/interview`);
}

export async function submitInterviewAnswerAction(
  projectId: string,
  questionId: InterviewQuestionId,
  answer: string,
): Promise<{ ok: true; complete: boolean } | { ok: false; error: string }> {
  const user = await requireAuthUser('/my-projects');
  if (!isSupabaseConfigured()) {
    return { ok: false, error: '데이터베이스가 연결되지 않았습니다.' };
  }

  const trimmed = answer.trim();
  if (trimmed.length < 2) {
    return { ok: false, error: '답변을 2자 이상 입력해 주세요.' };
  }

  const project = await assertProjectOwner(user.id, projectId);
  const bundle = parseInterviewBundle(project.onboardingContext);
  const state = bundle.sprint12;
  if (!state?.interviewStarted) {
    return { ok: false, error: '인터뷰를 먼저 시작해 주세요.' };
  }

  const questionIndex = INTERVIEW_QUESTION_IDS.indexOf(questionId);
  if (questionIndex < 0) {
    return { ok: false, error: '잘못된 질문입니다.' };
  }

  const answers = { ...state.answers, [questionId]: trimmed };
  const context = { ...state.context };

  if (questionId === 'q1-problem') {
    context.problem = trimmed;
  }
  if (questionId === 'q2-customer') {
    context.customer = trimmed;
    context.value = '고객의 문제를 해결할 때 얻는 핵심 가치를 정리합니다. (Mock)';
    context.hypothesis = '타깃 고객을 먼저 정의하면 다음 전략이 명확해집니다. (Mock)';
  }

  const nextIndex = questionIndex + 1;
  const complete = nextIndex >= INTERVIEW_QUESTION_IDS.length;

  const nextState: Sprint12InterviewState = {
    ...state,
    answers,
    context,
    currentQuestionIndex: complete ? nextIndex : nextIndex,
    interviewComplete: complete,
  };

  await saveInterviewState(user.id, projectId, nextState);
  return { ok: true, complete };
}

export async function getInterviewPageData(projectId: string) {
  const user = await requireAuthUser('/my-projects');
  const project = await getOwnedProject(user.id, projectId);
  if (!project) return null;

  const bundle = parseInterviewBundle(project.onboardingContext);
  return { project, interview: bundle.sprint12 ?? null };
}
