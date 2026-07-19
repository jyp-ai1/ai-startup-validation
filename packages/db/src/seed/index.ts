/**
 * Seed script placeholder — run after migration when Supabase is connected.
 *
 * Usage (future):
 *   pnpm --filter @repo/db seed
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and applied migrations.
 */

export type SeedOptions = {
  /** Skip if data already exists */
  skipIfExists?: boolean;
};

/** Seed development data — implement in Sprint 4+. */
export async function seedDatabase(_options: SeedOptions = {}): Promise<void> {
  // Infrastructure only — no seed data in Sprint 3.
  // Example future implementation:
  // const platform = createDatabasePlatform();
  // await platform.resolve(DbTokens.OrganizationRepository).create({...});
  console.info(
    '[@repo/db] seedDatabase: no-op — configure Supabase and implement in Sprint 4+',
  );
}
