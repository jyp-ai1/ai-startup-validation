import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function logLegacyRedirect(from: string, to: string, reason: string): void {
  if (process.env.NODE_ENV === 'development') {
    console.info('[journey-redirect]', 'middleware', from, '→', to, '|', reason);
  }
}

/** Exact path → destination (Sprint P1 — legacy block, CPO sign-off). */
const EXACT_REDIRECTS: Record<string, string> = {
  '/my-projects': '/workspace',
  '/projects': '/workspace',
  '/projects/new': '/workspace',
  '/execution': '/workspace',
  '/goal': '/workspace',
  '/workspaces': '/workspace',
  '/investigate': '/workspace',
  '/conclusion': '/workspace',
  '/dashboard': '/workspace',
  '/decision-center': '/workspace',
  '/validation': '/workspace',
  '/who': '/workspace',
  '/workflow': '/workspace',
  '/reports': '/workspace',
  '/evidence': '/workspace',
  '/research': '/workspace',
  '/voc': '/workspace',
  '/competitors': '/workspace',
  '/validation-score': '/workspace',
  '/government-grants': '/workspace',
  '/naver-commerce': '/workspace',
};

/**
 * Edge redirect for legacy routes — runs in middleware before page render.
 * Complements next.config redirects; ensures block even if config cache lags.
 */
export function resolveLegacyRedirect(request: NextRequest): NextResponse | null {
  const pathname = request.nextUrl.pathname;

  const exact = EXACT_REDIRECTS[pathname];
  if (exact) {
    const url = request.nextUrl.clone();
    url.pathname = exact;
    logLegacyRedirect(pathname, exact, 'exact_legacy_map');
    return NextResponse.redirect(url, 307);
  }

  const interviewMatch = pathname.match(/^\/my-projects\/([^/]+)\/interview$/);
  if (interviewMatch) {
    const url = request.nextUrl.clone();
    url.pathname = '/workspace';
    url.searchParams.set('project', interviewMatch[1]!);
    logLegacyRedirect(pathname, url.pathname + url.search, 'my_projects_interview');
    return NextResponse.redirect(url, 307);
  }

  const myProjectMatch = pathname.match(/^\/my-projects\/([^/]+)$/);
  if (myProjectMatch) {
    const url = request.nextUrl.clone();
    url.pathname = '/workspace';
    url.searchParams.set('project', myProjectMatch[1]!);
    logLegacyRedirect(pathname, url.pathname + url.search, 'my_projects_detail');
    return NextResponse.redirect(url, 307);
  }

  const projectSubtreeMatch = pathname.match(/^\/projects\/([^/]+)(?:\/(.*))?$/);
  if (projectSubtreeMatch) {
    const projectId = projectSubtreeMatch[1]!;
    if (projectId === 'new') {
      const url = request.nextUrl.clone();
      url.pathname = '/workspace';
      logLegacyRedirect(pathname, '/workspace', 'projects_new');
      return NextResponse.redirect(url, 307);
    }
    const url = request.nextUrl.clone();
    url.pathname = '/workspace';
    url.searchParams.set('project', projectId);
    logLegacyRedirect(pathname, url.pathname + url.search, 'projects_subtree');
    return NextResponse.redirect(url, 307);
  }

  return null;
}
