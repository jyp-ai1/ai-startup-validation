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
