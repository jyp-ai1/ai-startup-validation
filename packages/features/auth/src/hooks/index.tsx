'use client';

import * as React from 'react';

import type { AuthDomainUser } from '../domain/role';
import type { SessionState } from '../domain/session';
import { isAuthenticated } from '../domain/session';
import { PermissionProvider, usePermissionContext } from '../permissions/provider';

type SessionContextValue = {
  session: SessionState;
  user: AuthDomainUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

const SessionContext = React.createContext<SessionContextValue | null>(null);

type SessionProviderProps = {
  session: SessionState;
  user: AuthDomainUser | null;
  isLoading?: boolean;
  organizationId?: string | null;
  children: React.ReactNode;
};

/** Provides session + permission context to the tree. */
export function SessionProvider({
  session,
  user,
  isLoading = false,
  organizationId = null,
  children,
}: SessionProviderProps) {
  const sessionValue = React.useMemo<SessionContextValue>(
    () => ({
      session,
      user,
      isLoading,
      isAuthenticated: isAuthenticated(session),
    }),
    [session, user, isLoading],
  );

  return (
    <SessionContext.Provider value={sessionValue}>
      <PermissionProvider
        session={session}
        user={user}
        organizationId={organizationId}
      >
        {children}
      </PermissionProvider>
    </SessionContext.Provider>
  );
}

export function useSessionContext(): SessionContextValue {
  const ctx = React.useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSessionContext must be used within SessionProvider');
  }
  return ctx;
}

export function useSession() {
  const { session, isLoading, isAuthenticated: authed } = useSessionContext();
  return { session, isLoading, isAuthenticated: authed };
}

export function useUser() {
  const { user, isLoading } = useSessionContext();
  return { user, isLoading };
}

export function usePermission() {
  const { can, canAny, canAll, permissions } = usePermissionContext();
  return { can, canAny, canAll, permissions };
}

export function useRole() {
  const { user } = useSessionContext();
  return {
    role: user?.role ?? null,
    isRole: (role: AuthDomainUser['role']) => user?.role === role,
  };
}
