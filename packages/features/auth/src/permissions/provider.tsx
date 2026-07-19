'use client';

import * as React from 'react';

import type { Permission } from '../domain/permission';
import type { AuthDomainUser } from '../domain/role';
import type { SessionState } from '../domain/session';
import { isAuthenticated } from '../domain/session';

import type { PermissionContext } from './context';
import { createPermissionContext } from './context';
import { permissionChecker } from './checker';
import { permissionResolver } from './resolver';

export type PermissionProviderState = {
  session: SessionState;
  user: AuthDomainUser | null;
  organizationId: string | null;
  context: PermissionContext | null;
  permissions: Permission[];
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  canAll: (permissions: Permission[]) => boolean;
};

const PermissionContextReact = React.createContext<PermissionProviderState | null>(
  null,
);

type PermissionProviderProps = {
  session: SessionState;
  user: AuthDomainUser | null;
  organizationId?: string | null;
  children: React.ReactNode;
};

/** React provider for authorization context. */
export function PermissionProvider({
  session,
  user,
  organizationId = null,
  children,
}: PermissionProviderProps) {
  const value = React.useMemo<PermissionProviderState>(() => {
    const context =
      user && isAuthenticated(session)
        ? createPermissionContext({
            userId: user.id,
            role: user.role,
            organizationId: organizationId ?? user.organizationId,
          })
        : null;

    const permissions = context ? permissionResolver.resolve(context) : [];

    return {
      session,
      user,
      organizationId: organizationId ?? user?.organizationId ?? null,
      context,
      permissions,
      can: (permission: Permission) =>
        context ? permissionChecker.can(context, permission) : false,
      canAny: (perms: Permission[]) =>
        context ? permissionChecker.canAny(context, perms) : false,
      canAll: (perms: Permission[]) =>
        context ? permissionChecker.canAll(context, perms) : false,
    };
  }, [session, user, organizationId]);

  return (
    <PermissionContextReact.Provider value={value}>
      {children}
    </PermissionContextReact.Provider>
  );
}

export function usePermissionContext(): PermissionProviderState {
  const ctx = React.useContext(PermissionContextReact);
  if (!ctx) {
    throw new Error('usePermissionContext must be used within PermissionProvider');
  }
  return ctx;
}
