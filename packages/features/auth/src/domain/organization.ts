import type { ID, ISODateString } from '@repo/types';

/** Organization in auth/authorization context. */
export type AuthOrganization = {
  id: ID;
  name: string;
  slug: string;
  ownerId: ID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

/** Workspace — sub-scope within an organization (future multi-workspace). */
export type Workspace = {
  id: ID;
  name: string;
  slug: string;
  organizationId: ID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};
