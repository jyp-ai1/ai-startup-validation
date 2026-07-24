import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  const projectId = request.nextUrl.searchParams.get('project');

  if (!projectId) {
    return response;
  }

  if (response instanceof NextResponse) {
    response.cookies.set('ACTIVE_PROJECT_ID', projectId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
    return response;
  }

  const next = NextResponse.next();
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
