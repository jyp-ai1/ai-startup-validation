import type { ID, ISODateString } from './global';

/** Organization / workspace entity. */
export type Organization = {
  id: ID;
  name: string;
  slug: string;
  ownerId: ID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type CreateOrganizationInput = {
  name: string;
  slug: string;
  ownerId: ID;
};

export type UpdateOrganizationInput = Partial<
  Pick<Organization, 'name' | 'slug'>
>;
