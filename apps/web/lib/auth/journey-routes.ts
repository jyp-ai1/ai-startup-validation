type JourneyRedirectOptions = {
  projectId: string;
  welcome?: boolean;
  authComplete?: boolean;
  promoted?: boolean;
};

/** Canonical authenticated project URL — always /workspace. */
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
  return `/workspace?${qs.toString()}`;
}

export function buildProjectCanvasUrl(projectId: string): string {
  return `/workspace?project=${encodeURIComponent(projectId)}`;
}

export function buildWorkspaceProjectQuery(params: {
  project?: string;
  welcome?: string;
  promoted?: string;
  auth?: string;
  demo?: string;
}): string {
  const qs = new URLSearchParams();
  if (params.project) qs.set('project', params.project);
  if (params.welcome === '1') qs.set('welcome', '1');
  if (params.promoted === '1') qs.set('promoted', '1');
  if (params.auth === 'complete') qs.set('auth', 'complete');
  if (params.demo) qs.set('demo', params.demo);
  const query = qs.toString();
  return query ? `?${query}` : '';
}
