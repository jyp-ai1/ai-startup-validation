'use server';

import { revalidatePath } from 'next/cache';

import { isSupabaseConfigured } from '@repo/db';

import { assertProjectOwner } from '@/features/projects/services/project-service';
import { getStartupProjectRepository } from '@/lib/db/platform';
import {
  mergeWorkspacePersistedContext,
  type WorkspacePersistedSnapshot,
} from '@/lib/project/workspace-persisted-state';
import { requireAuthUser } from '@/lib/auth/server-auth';

export type PersistWorkspaceSnapshotInput = {
  projectId: string;
  snapshot: WorkspacePersistedSnapshot;
};

export async function persistWorkspaceSnapshotAction(
  input: PersistWorkspaceSnapshotInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Database not configured' };
  }

  const user = await requireAuthUser('/workspace');
  const { projectId, snapshot } = input;

  if (!projectId || !snapshot.updatedAt) {
    return { ok: false, error: 'Invalid snapshot' };
  }

  try {
    const project = await assertProjectOwner(user.id, projectId);
    const repo = getStartupProjectRepository();
    await repo.update(projectId, {
      onboardingContext: mergeWorkspacePersistedContext(project.onboardingContext, snapshot),
    });
    revalidatePath('/workspace');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Failed to persist workspace snapshot' };
  }
}
