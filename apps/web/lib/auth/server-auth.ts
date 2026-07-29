import { cookies } from 'next/headers';

import { createServerClient, isSupabaseConfigured } from '@repo/db';

export type AppAuthUser = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
};

export type WorkspaceMode = 'demo' | 'personal';

export const WORKSPACE_MODE_COOKIE = 'WORKSPACE_MODE';
export const DEMO_MODE_VALUE = 'demo';

/** Placeholder for unauthenticated demo workspace (no Supabase session). */
export const DEMO_GUEST_USER: AppAuthUser = {
  id: 'demo-guest',
  email: '',
  fullName: 'Demo',
  avatarUrl: null,
  emailVerified: false,
};

export function isDemoQueryParam(value: string | null | undefined): boolean {
  return value === '1' || value === 'guided' || value === 'readonly';
}

export async function getServerAuthUser(): Promise<AppAuthUser | null> {
  if (!isSupabaseConfigured()) return null;

  const cookieStore = await cookies();
  const supabase = createServerClient({
    cookies: {
      getAll: () => cookieStore.getAll(),
      set: (name, value, options) => {
        try {
          cookieStore.set(name, value, options);
        } catch {
          /* set from Server Component — ignored */
        }
      },
    },
  });

  if (!supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const metadata = user.user_metadata ?? {};

  return {
    id: user.id,
    email: user.email ?? '',
    fullName:
      (typeof metadata.full_name === 'string' && metadata.full_name) ||
      (typeof metadata.name === 'string' && metadata.name) ||
      null,
    avatarUrl:
      (typeof metadata.avatar_url === 'string' && metadata.avatar_url) ||
      (typeof metadata.picture === 'string' && metadata.picture) ||
      null,
    emailVerified: Boolean(user.email_confirmed_at),
  };
}

export async function getWorkspaceMode(): Promise<WorkspaceMode> {
  const cookieStore = await cookies();
  const mode = cookieStore.get(WORKSPACE_MODE_COOKIE)?.value;
  return mode === DEMO_MODE_VALUE ? 'demo' : 'personal';
}

export async function isDemoWorkspace(): Promise<boolean> {
  return (await getWorkspaceMode()) === 'demo';
}

/** Redirect to login when unauthenticated (Sprint 1.1 protected routes). */
export async function requireAuthUser(nextPath?: string): Promise<AppAuthUser> {
  const user = await getServerAuthUser();
  if (user) return user;

  const { redirect } = await import('next/navigation');
  const next = nextPath ?? '/workspace';
  redirect(`/auth/login?next=${encodeURIComponent(next)}`);
  throw new Error('Unreachable');
}

/** Admin ops — ADMIN_EMAIL allowlist (Sprint 4.8). Never hardcode credentials. */
export async function requireAdminUser(): Promise<AppAuthUser> {
  const user = await requireAuthUser('/admin/operations');
  const { env } = await import('@repo/core/env');
  const adminEmail = env.ADMIN_EMAIL?.trim().toLowerCase();

  if (!adminEmail) {
    const { redirect } = await import('next/navigation');
    redirect('/forbidden');
    throw new Error('Unreachable');
  }

  if (user.email.trim().toLowerCase() !== adminEmail) {
    const { redirect } = await import('next/navigation');
    redirect('/forbidden');
    throw new Error('Unreachable');
  }

  return user;
}
