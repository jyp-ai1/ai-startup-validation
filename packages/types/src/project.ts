import type { ID, ISODateString } from './global';

/** Project entity scoped to an organization. */
export type Project = {
  id: ID;
  name: string;
  organizationId: ID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

export type CreateProjectInput = {
  name: string;
  organizationId: ID;
};

export type UpdateProjectInput = Partial<Pick<Project, 'name'>>;
