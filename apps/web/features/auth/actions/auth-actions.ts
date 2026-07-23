'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { createServerClient, isSupabaseConfigured } from '@repo/db';

export async function signOutAction() {
  if (!isSupabaseConfigured()) {
    redirect('/');
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

  if (supabase) {
    await supabase.auth.signOut();
  }

  cookieStore.delete('WORKSPACE_MODE');
  cookieStore.delete('ACTIVE_PROJECT_ID');

  revalidatePath('/', 'layout');
  redirect('/');
}
