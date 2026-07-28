/** Legacy route redirects — Sprint 5.1.1 Epic K. Do not add features here. */

export function legacyProjectCanvasRedirect(projectId?: string | null, extra?: Record<string, string>): string {
  const qs = new URLSearchParams(extra ?? {});
  if (projectId) qs.set('project', projectId);
  const query = qs.toString();
  return `/validation${query ? `?${query}` : ''}`;
}
