import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

function withPathnameHeader(response: NextResponse, pathname: string) {
  response.headers.set('x-pathname', pathname);
  return response;
}

export default function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  const projectId = request.nextUrl.searchParams.get('project');
  const pathname = request.nextUrl.pathname;

  if (!projectId) {
    return response instanceof NextResponse
      ? withPathnameHeader(response, pathname)
      : response;
  }

  if (response instanceof NextResponse) {
    withPathnameHeader(response, pathname);
    response.cookies.set('ACTIVE_PROJECT_ID', projectId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
    return response;
  }

  const next = withPathnameHeader(NextResponse.next(), pathname);
  next.cookies.set('ACTIVE_PROJECT_ID', projectId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  return next;
}

export const config = {
  matcher: ['/((?!api|auth|demo|health|version|build-info|_next|_vercel|.*\\..*).*)'],
};
