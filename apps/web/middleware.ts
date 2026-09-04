import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

import { updateSession } from './lib/auth/update-session';
import { resolveLegacyRedirect } from './lib/legacy-route-redirects';
import { DEMO_MODE_VALUE, WORKSPACE_MODE_COOKIE } from './lib/auth/server-auth';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const legacyRedirect = resolveLegacyRedirect(request);
  if (legacyRedirect) {
    return legacyRedirect;
  }

  const intlResponse = intlMiddleware(request);
  const pathname = request.nextUrl.pathname;

  const applyPathHeader = (res: NextResponse) => {
    res.headers.set('x-pathname', pathname);
    return res;
  };

  let response =
    intlResponse instanceof NextResponse ? intlResponse : NextResponse.next({ request });

  response = await updateSession(request, response);

  const demoParam = request.nextUrl.searchParams.get('demo');
  const isDemoWorkspaceRequest =
    demoParam === '1' || demoParam === 'guided' || demoParam === 'readonly';

  if (request.nextUrl.pathname === '/workspace' && isDemoWorkspaceRequest) {
    response.cookies.set(WORKSPACE_MODE_COOKIE, DEMO_MODE_VALUE, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
    });
    response.headers.set('x-workspace-demo', '1');
  }

  const projectId = request.nextUrl.searchParams.get('project');

  if (!projectId) {
    return applyPathHeader(response);
  }

  response.cookies.set('ACTIVE_PROJECT_ID', projectId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  return applyPathHeader(response);
}

export const config = {
  matcher: ['/((?!api|auth|demo|health|version|build-info|_next|_vercel|.*\\..*).*)'],
};
