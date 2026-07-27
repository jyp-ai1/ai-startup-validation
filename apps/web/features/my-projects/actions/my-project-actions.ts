'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { isSupabaseConfigured } from '@repo/db';

import {
  createOwnedProject,
  listOwnedProjects,
} from '@/features/projects/services/project-service';
import { requireAuthUser } from '@/lib/auth/server-auth';

export type CreateMyProjectState = {
  error?: string;
};

export async function listMyProjectsForPage() {
  const user = await requireAuthUser('/my-projects');
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
  const user = await requireAuthUser('/my-projects');

  if (!isSupabaseConfigured()) {
    return { error: '데이터베이스가 연결되지 않았습니다.' };
  }

  const title = formData.get('title')?.toString().trim() ?? '';
  if (title.length < 2) {
    return { error: '프로젝트 이름을 2자 이상 입력해 주세요.' };
  }

  const project = await createOwnedProject(user.id, {
    title,
    summary: title,
  });

  revalidatePath('/my-projects');
  redirect(`/my-projects/${project.id}`);
}
