'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { isSupabaseConfigured } from '@repo/db';

import {
  createOwnedProject,
  listOwnedProjects,
} from '@/features/projects/services/project-service';
import {
  buildInitialInterviewState,
  isReviewType,
} from '@/features/interview/types/interview-state';
import { requireAuthUser } from '@/lib/auth/server-auth';

export type CreateMyProjectState = {
  error?: string;
};

export async function listMyProjectsForPage() {
  const user = await requireAuthUser('/workspace');
  if (!isSupabaseConfigured()) {
    return { user, projects: [], dbReady: false as const };
  }
  const projects = await listOwnedProjects(user.id);
  return { user, projects, dbReady: true as const };
}

export async function createMyProjectAction(
  _prev: CreateMyProjectState,
  formData: FormData,
): Promise<CreateMyProjectState> {
  const user = await requireAuthUser('/workspace');

  if (!isSupabaseConfigured()) {
    return { error: '데이터베이스가 연결되지 않았습니다.' };
  }

  const title = formData.get('title')?.toString().trim() ?? '';
  if (title.length < 2) {
    return { error: '프로젝트 이름을 2자 이상 입력해 주세요.' };
  }

  const reviewTypeRaw = formData.get('reviewType')?.toString() ?? '';
  if (!isReviewType(reviewTypeRaw)) {
    return { error: '검토 유형을 선택해 주세요.' };
  }

  const description = formData.get('description')?.toString().trim() ?? '';

  const project = await createOwnedProject(user.id, {
    title,
    summary: description || title,
    onboardingContext: {
      sprint12: buildInitialInterviewState(reviewTypeRaw, description),
    },
  });

  revalidatePath('/my-projects');
  redirect(`/my-projects/${project.id}`);
}
