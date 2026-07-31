import type { AppAuthUser } from './server-auth';

export const DEMO_GUEST_ID = 'demo-guest';

export function isDemoGuestUser(user: AppAuthUser | null | undefined): boolean {
  if (!user) return true;
  return user.id === DEMO_GUEST_ID || !user.email?.trim();
}

export function isAuthenticatedAppUser(user: AppAuthUser | null | undefined): boolean {
  return Boolean(user?.email?.trim()) && user?.id !== DEMO_GUEST_ID;
}
