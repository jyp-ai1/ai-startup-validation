import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/** Exact path → destination (Sprint P1 — legacy block, CPO sign-off). */
const EXACT_REDIRECTS: Record<string, string> = {
  '/my-projects': '/workspace',
  '/projects': '/workspace',
  '/projects/new': '/workspace',
  '/execution': '/validation',
  '/goal': '/who',
  '/workspaces': '/workspace',
  '/investigate': '/who',
  '/conclusion': '/validation',
  '/dashboard': '/validation',
  '/decision-center': '/validation',
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
    return NextResponse.redirect(url, 307);
  }

  const interviewMatch = pathname.match(/^\/my-projects\/([^/]+)\/interview$/);
  if (interviewMatch) {
    const url = request.nextUrl.clone();
    url.pathname = '/validation';
    url.searchParams.set('project', interviewMatch[1]!);
    return NextResponse.redirect(url, 307);
  }

  const myProjectMatch = pathname.match(/^\/my-projects\/([^/]+)$/);
  if (myProjectMatch) {
    const url = request.nextUrl.clone();
    url.pathname = '/validation';
    url.searchParams.set('project', myProjectMatch[1]!);
    return NextResponse.redirect(url, 307);
  }

  const projectSubtreeMatch = pathname.match(/^\/projects\/([^/]+)(?:\/(.*))?$/);
  if (projectSubtreeMatch) {
    const projectId = projectSubtreeMatch[1]!;
    if (projectId === 'new') {
      const url = request.nextUrl.clone();
      url.pathname = '/workspace';
      return NextResponse.redirect(url, 307);
    }
    const url = request.nextUrl.clone();
    url.pathname = '/validation';
    url.searchParams.set('project', projectId);
    return NextResponse.redirect(url, 307);
  }

  return null;
}
