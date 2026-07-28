type JourneyRedirectOptions = {
  projectId: string;
  welcome?: boolean;
  authComplete?: boolean;
  promoted?: boolean;
};

/** Post-login journey entry — matches Demo UX (/who → /workflow → /validation). */
export function buildAuthenticatedJourneyUrl({
  projectId,
  welcome = false,
  authComplete = false,
  promoted = false,
}: JourneyRedirectOptions): string {
  const qs = new URLSearchParams();
  qs.set('project', projectId);
  if (welcome) qs.set('welcome', '1');
  if (authComplete) qs.set('auth', 'complete');
  if (promoted) qs.set('promoted', '1');

  const query = qs.toString();
  const suffix = query ? `?${query}` : '';

  if (welcome || promoted) {
    return `/who${suffix}`;
  }

  return `/validation${suffix}`;
}

export function buildProjectCanvasUrl(projectId: string): string {
  return `/validation?project=${encodeURIComponent(projectId)}`;
}
