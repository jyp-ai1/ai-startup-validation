import { getOwnedProject } from '@/features/projects/services/project-service';

export async function requireOwnedProject(
  userId: string,
  projectId: string | null | undefined,
): Promise<{ ok: true; projectId: string } | { ok: false; status: 400 | 403; error: 'project_required' | 'project_forbidden' }> {
  const id = projectId?.trim() ?? '';
  if (!id) return { ok: false, status: 400, error: 'project_required' };
  const project = await getOwnedProject(userId, id);
  if (!project) return { ok: false, status: 403, error: 'project_forbidden' };
  return { ok: true, projectId: id };
}
