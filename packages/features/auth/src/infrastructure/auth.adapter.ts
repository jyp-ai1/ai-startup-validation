import type { AuthPort } from '@repo/db';

/** Re-export auth port access — authentication stays in @repo/db adapter. */
export type { AuthPort };

export function createAuthInfrastructure(authPort: AuthPort) {
  return { authPort };
}

export type AuthInfrastructure = ReturnType<typeof createAuthInfrastructure>;
