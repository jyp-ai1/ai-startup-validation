'use client';

import * as React from 'react';

import type { Permission } from '../domain/permission';
import type { AuthRole } from '../domain/role';

import { usePermission } from '../hooks';
import { useRole, useSession } from '../hooks';

type ProtectedProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

/** Render children only when authenticated. */
export function Protected({ children, fallback = null }: ProtectedProps) {
  const { isAuthenticated, isLoading } = useSession();

  if (isLoading) return null;
  if (!isAuthenticated) return <>{fallback}</>;
  return <>{children}</>;
}

type PermissionGateProps = {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

/** Render children only when user has permission. */
export function PermissionGate({
  permission,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { can } = usePermission();

  if (!can(permission)) return <>{fallback}</>;
  return <>{children}</>;
}

type RoleGateProps = {
  role: AuthRole;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

/** Render children only when user has exact role. Prefer PermissionGate. */
export function RoleGate({ role, children, fallback = null }: RoleGateProps) {
  const { isRole } = useRole();

  if (!isRole(role)) return <>{fallback}</>;
  return <>{children}</>;
}

export { SessionProvider } from '../hooks';
