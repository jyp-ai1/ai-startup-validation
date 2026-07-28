'use server';

import { redirect } from 'next/navigation';

/** Delegates to /auth/logout route — cookies must be cleared on NextResponse, not in Server Actions. */
export async function signOutAction() {
  redirect('/auth/logout');
}
