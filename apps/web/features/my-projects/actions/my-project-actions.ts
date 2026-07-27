'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
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
import {
  DEMO_PROJECT_DRAFT_COOKIE,
  parseDemoProjectDraftCookie,
} from '@/features/workflow-journey/lib/v2-demo-project-store';
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

/** Bootstrap first project — promotes demo draft when present (Sprint 4.3). */
export async function bootstrapFirstProject(userId: string, promoteDemo = false) {
  const existing = await listOwnedProjects(userId);
  if (existing.length > 0) {
    return existing[0]!;
  }

  let title = '내 첫 프로젝트';
  let summary = 'LaunchLens에서 시작한 첫 프로젝트';
  let problem = '';
  let customer = '';

  if (promoteDemo) {
    const cookieStore = await cookies();
    const draft = parseDemoProjectDraftCookie(cookieStore.get(DEMO_PROJECT_DRAFT_COOKIE)?.value);
    if (draft) {
      title = draft.serviceName.trim();
      summary = draft.tagline.trim();
      problem = draft.problem?.trim() ?? '';
      customer = draft.customer?.trim() ?? '';
    } else {
      title = 'LaunchLens';
      summary = '창업자의 전략적 사고를 축적하는 Workspace';
    }
  }

  const sprint12 = buildInitialInterviewState('startup-idea', summary);
  if (problem || customer) {
    sprint12.context = { problem, customer };
    sprint12.description = summary;
  }

  return createOwnedProject(userId, {
    title,
    summary,
    onboardingContext: { sprint12 },
  });
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
