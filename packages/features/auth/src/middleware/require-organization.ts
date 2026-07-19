import { ForbiddenError } from '@repo/core/errors';
import type { ID } from '@repo/types';

import type { AuthDomainUser } from '../domain/role';

/** Require user to belong to an organization (single-org mode). */
export function requireOrganization(
  user: AuthDomainUser,
  organizationId?: ID,
): void {
  if (!user.organizationId) {
    throw new ForbiddenError('Organization membership required');
  }

  if (organizationId && user.organizationId !== organizationId) {
    throw new ForbiddenError('Access denied for this organization');
  }
}

export function requireOrganizationMatch(
  user: AuthDomainUser,
  organizationId: ID,
): void {
  requireOrganization(user, organizationId);
}
