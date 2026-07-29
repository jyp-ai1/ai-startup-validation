/** Legacy route redirects — canonical /workspace?project= */
export function legacyProjectCanvasRedirect(projectId?: string | null, extra?: Record<string, string>): string {
  const qs = new URLSearchParams(extra ?? {});
  if (projectId) qs.set('project', projectId);
  const query = qs.toString();
  return `/workspace${query ? `?${query}` : ''}`;
}
