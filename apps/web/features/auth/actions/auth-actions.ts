'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { createServerClient, isSupabaseConfigured } from '@repo/db';

import { resolvePostLoginWorkspaceUrl } from '@/lib/auth/post-login-redirect';
import { resolveQaLoginEmail } from '@/lib/auth/qa-password-login';

/** Delegates to /auth/logout route — cookies must be cleared on NextResponse, not in Server Actions. */
export async function signOutAction() {
  redirect('/auth/logout');
}

export type QaPasswordLoginState = { error: 'invalid' | 'config' | null };

/** Allowlisted QA login ids only. Does not enable general password signup. */
export async function signInWithQaPasswordAction(
  _prev: QaPasswordLoginState,
  formData: FormData,
): Promise<QaPasswordLoginState> {
  const loginId = String(formData.get('loginId') ?? '');
  const password = String(formData.get('password') ?? '');
  const nextRaw = String(formData.get('next') ?? '/workspace');
  const safeNext = nextRaw.startsWith('/') ? nextRaw : '/workspace';
  const email = resolveQaLoginEmail(loginId);

  if (!email || !password) {
    return { error: 'invalid' };
  }

  if (!isSupabaseConfigured()) {
    return { error: 'config' };
  }

  const cookieStore = await cookies();
  const supabase = createServerClient({
    cookies: {
      getAll: () => cookieStore.getAll(),
      set: (name, value, options) => {
        cookieStore.set(name, value, options);
      },
    },
  });

  if (!supabase) {
    return { error: 'config' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session || !data.user?.id) {
    return { error: 'invalid' };
  }

  const dest = await resolvePostLoginWorkspaceUrl(data.user.id, {
    authComplete: true,
    safeNext,
  });
  redirect(dest);
}
