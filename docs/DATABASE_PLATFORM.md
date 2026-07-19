# Database Platform

Hexagonal (Ports & Adapters) database layer for the AI SaaS Starter Kit.

**Supabase is one adapter — not the architecture.**

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  apps/web (Application)                                  │
│  import { getUserRepository } from '@/lib/db/platform'   │
│  ❌ NEVER import @supabase/supabase-js                     │
└───────────────────────────┬─────────────────────────────┘
                            │ depends on interfaces
┌───────────────────────────▼─────────────────────────────┐
│  packages/features (Sprint 4+) — domain services       │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  packages/db — Database Platform                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Ports       │  │ Repositories │  │ DI Container  │  │
│  │ AuthPort    │  │ UserRepo     │  │ DbContainer   │  │
│  │ StoragePort │  │ OrgRepo      │  │ DbTokens      │  │
│  │ RealtimePort│  │ ProjectRepo  │  └───────────────┘  │
│  └──────┬──────┘  └──────┬───────┘                      │
│         │                │                               │
│  ┌──────▼────────────────▼───────────────────────────┐  │
│  │ adapters/supabase/ (Supabase Adapter)              │  │
│  │  client.ts · browser · server · admin · service    │  │
│  │  auth.adapter · storage.adapter · realtime.adapter │  │
│  └──────────────────────────┬──────────────────────────┘  │
└─────────────────────────────┼────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Supabase Cloud   │
                    │  Auth · DB · Storage │
                    └───────────────────┘
```

---

## Package: `@repo/db`

| Path | Purpose |
|------|---------|
| `src/auth/auth.port.ts` | Auth interface (login, session, etc.) |
| `src/storage/storage.port.ts` | Storage interface (upload, signedUrl, etc.) |
| `src/realtime/realtime.port.ts` | Realtime interface (subscribe, publish) |
| `src/repositories/*.ts` | Supabase repo implementations |
| `src/adapters/supabase/` | Client factory + adapter impls |
| `src/di/container.ts` | Dependency injection |
| `src/env/env.ts` | Supabase env validation |
| `src/migration/` | SQL migrations |
| `src/seed/` | Seed scripts |

---

## Repository Pattern

Repositories implement `BaseRepository<T>` from `@repo/core`:

```typescript
import type { BaseRepository } from '@repo/core/repository';
import type { User, CreateUserInput, UpdateUserInput } from '@repo/types';

export type UserRepository = BaseRepository<
  User,
  CreateUserInput,
  UpdateUserInput
>;
```

Implementations:

| Interface | Supabase Adapter | Table |
|-----------|------------------|-------|
| `UserRepository` | `SupabaseUserRepository` | `profiles` |
| `OrganizationRepository` | `SupabaseOrganizationRepository` | `organizations` |
| `ProjectRepository` | `SupabaseProjectRepository` | `projects` |

---

## Dependency Injection

Applications resolve **interfaces**, never concrete classes:

```typescript
import { DbTokens, getDatabasePlatform, type UserRepository } from '@repo/db';

const container = getDatabasePlatform();
const userRepo = container.resolve<UserRepository>(DbTokens.UserRepository);

// Shorthand via app helper:
import { getUserRepository } from '@/lib/db/platform';
const users = await getUserRepository().findAll();
```

### Swapping Adapters (Future)

```typescript
// Prisma migration — register different impl, zero app changes:
container.register(DbTokens.UserRepository, new PrismaUserRepository());
```

---

## Client Factory

`SupabaseClientFactory` provides four client modes:

| Client | Module | Use case |
|--------|--------|----------|
| Browser | `browser.ts` | Client components (anon key) |
| Server | `server.ts` | API routes / RSC (cookies) |
| Admin | `admin.ts` | Service role, bypass RLS |
| Service | `service.ts` | Repository background ops |

All clients are created **inside `@repo/db`** only.

---

## Storage Adapter

`StoragePort` abstracts object storage:

```typescript
const storage = container.platform.storage;

await storage.upload('avatars/user-1.png', file, { contentType: 'image/png' });
const url = await storage.signedUrl('avatars/user-1.png', 3600);
await storage.remove('avatars/user-1.png');
```

Default bucket: `assets` (create in Supabase dashboard).

---

## Realtime Adapter

`RealtimePort` abstracts pub/sub:

```typescript
const realtime = container.platform.realtime;

const sub = await realtime.subscribe('room:123', 'message', (payload) => {
  console.log(payload);
});

await realtime.publish('room:123', 'message', { text: 'Hello' });
await realtime.unsubscribe(sub);
```

---

## Authentication Adapter

`AuthPort` abstracts identity:

| Method | Description |
|--------|-------------|
| `login` | Email/password sign-in |
| `logout` | End session |
| `refresh` | Refresh tokens |
| `getSession` | Current session |
| `getUser` | Current auth user |
| `createUser` | Sign up |
| `resetPassword` | Send reset email |
| `verifyEmail` | Verify OTP/token |

Business auth flows (RBAC, middleware) → Sprint 4 in `packages/features/auth`.

---

## Environment

All Supabase env vars live in `@repo/db/env`:

| Variable | Scope |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client |
| `SUPABASE_URL` | Server |
| `SUPABASE_ANON_KEY` | Server |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only |
| `DATABASE_URL` | Optional direct Postgres |

Removed from `@repo/core/env` — database config is isolated.

---

## Why Adapter Pattern?

| Problem (typical boilerplate) | Our approach |
|-------------------------------|--------------|
| `import { supabase } from '@/lib/supabase'` everywhere | Single `@repo/db` entry |
| Switching DB = rewrite app | Swap adapter registration |
| Untestable services | Mock `UserRepository` interface |
| Env scattered across apps | Centralized `dbEnv` |

### Future Adapters

| Provider | Package (planned) |
|----------|-------------------|
| Supabase | `@repo/db` (current) |
| Prisma + PostgreSQL | `@repo/db/adapters/prisma` |
| Firebase | `@repo/db/adapters/firebase` |
| PlanetScale | `@repo/db/adapters/planetscale` |
| Neon | `@repo/db/adapters/neon` |

Services and UI remain unchanged when swapping.

---

## Migration

SQL: `packages/db/src/migration/001_initial_schema.sql`

Tables: `profiles`, `organizations`, `projects` + triggers for `updated_at` and auth profile creation.

Apply via Supabase SQL editor — see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).

---

## Related

- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
- [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md)
- [DECISIONS.md](./DECISIONS.md) ADR-003, ADR-006
