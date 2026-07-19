import type { ID, ISODateString } from './global';
import type { Role } from './role';

/** Application user entity. */
export type User = {
  id: ID;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: Role;
  createdAt: ISODateString;
  updatedAt: ISODateString;
};

/** Minimal user profile for public display. */
export type UserProfile = Pick<User, 'id' | 'fullName' | 'avatarUrl'>;

/** User creation input (before persistence). */
export type CreateUserInput = {
  email: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  role?: Role;
};

/** User update input. */
export type UpdateUserInput = Partial<
  Pick<User, 'fullName' | 'avatarUrl' | 'role'>
>;
