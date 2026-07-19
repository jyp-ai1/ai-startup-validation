import type { ID } from '@repo/types';

/**
 * Base repository interface — database-agnostic contract.
 *
 * Implementations (Supabase, Prisma, Neon, etc.) live in adapter packages.
 * Application code depends on this interface, never on a specific SDK.
 */
export interface BaseRepository<TEntity, TCreate = Partial<TEntity>, TUpdate = Partial<TEntity>> {
  /** Find a single entity by ID. */
  findById(id: ID): Promise<TEntity | null>;

  /** Find all entities (optionally filtered). */
  findAll(filter?: Record<string, unknown>): Promise<TEntity[]>;

  /** Create a new entity. */
  create(data: TCreate): Promise<TEntity>;

  /** Update an existing entity. */
  update(id: ID, data: TUpdate): Promise<TEntity>;

  /** Delete an entity by ID. */
  delete(id: ID): Promise<void>;

  /** Check if an entity exists. */
  exists(id: ID): Promise<boolean>;

  /** Count entities (optionally filtered). */
  count(filter?: Record<string, unknown>): Promise<number>;
}

/**
 * Paginated repository extension for list endpoints.
 */
export interface PaginatedRepository<TEntity> {
  findPaginated(
    page: number,
    limit: number,
    filter?: Record<string, unknown>,
  ): Promise<{
    items: TEntity[];
    total: number;
  }>;
}

export type Repository<TEntity, TCreate = Partial<TEntity>, TUpdate = Partial<TEntity>> =
  BaseRepository<TEntity, TCreate, TUpdate>;
