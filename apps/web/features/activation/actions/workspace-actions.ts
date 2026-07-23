'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  DEMO_MODE_VALUE,
  WORKSPACE_MODE_COOKIE,
} from '@/lib/auth/server-auth';
import { listDemoProjects } from '@/features/projects/services/project-service';

export async function switchToDemoWorkspace() {
  const cookieStore = await cookies();
  const demoProjects = await listDemoProjects();
  const demoProject = demoProjects[0];

  cookieStore.set(WORKSPACE_MODE_COOKIE, DEMO_MODE_VALUE, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
  });

  if (demoProject) {
    cookieStore.set('ACTIVE_PROJECT_ID', demoProject.id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
    });
  } else {
    cookieStore.delete('ACTIVE_PROJECT_ID');
  }

  revalidatePath('/dashboard');
  redirect('/dashboard?demo=1');
}

export async function switchToPersonalWorkspace(projectId?: string) {
  const cookieStore = await cookies();
  cookieStore.delete(WORKSPACE_MODE_COOKIE);

  if (projectId) {
    cookieStore.set('ACTIVE_PROJECT_ID', projectId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  } else {
    cookieStore.delete('ACTIVE_PROJECT_ID');
  }

  revalidatePath('/dashboard');
  redirect('/dashboard');
}

export async function switchActiveProject(projectId: string) {
  const cookieStore = await cookies();
  cookieStore.set('ACTIVE_PROJECT_ID', projectId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });

  revalidatePath('/dashboard');
  redirect(`/dashboard?project=${projectId}`);
}
