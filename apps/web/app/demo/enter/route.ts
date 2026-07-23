import { NextResponse } from 'next/server';

import { DEMO_MODE_VALUE, WORKSPACE_MODE_COOKIE } from '@/lib/auth/server-auth';
import { listDemoProjects } from '@/features/projects/services/project-service';

export async function GET(request: Request) {
  try {
    const { origin } = new URL(request.url);
    const demoProjects = await listDemoProjects();
    const demoProject = demoProjects[0];

    const destination = demoProject
      ? `/dashboard?demo=1&project=${demoProject.id}`
      : '/dashboard?demo=1';

    const response = NextResponse.redirect(`${origin}${destination}`);

    response.cookies.set(WORKSPACE_MODE_COOKIE, DEMO_MODE_VALUE, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
    });

    if (demoProject) {
      response.cookies.set('ACTIVE_PROJECT_ID', demoProject.id, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
        sameSite: 'lax',
      });
    }

    return response;
  } catch {
    const { origin } = new URL(request.url);
    const response = NextResponse.redirect(`${origin}/dashboard?demo=1`);
    response.cookies.set(WORKSPACE_MODE_COOKIE, DEMO_MODE_VALUE, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
    });
    return response;
  }
}
