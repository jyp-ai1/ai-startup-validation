# Backend Architecture

This document describes the backend infrastructure layer — designed so database, auth, and AI providers can be swapped without rewriting application logic.

## Design Principle

```
Application (apps/web)
        ↓
   Service Layer        ← business rules
        ↓
  Repository Interface  ← data access contract
        ↓
  Database Adapter      ← Supabase / Prisma / Neon (Sprint 3+)
        ↓
     Database
```

**Never import a database SDK in application code or services.** Only adapter implementations touch the SDK.

---

## Package Overview

| Package | Purpose |
|---------|---------|
| `@repo/core` | Env, logger, errors, response, validation, repository/service base |
| `@repo/types` | Shared TypeScript types (User, Role, API, Pagination) |
| `@repo/utils` | Pure utility functions (date, string, array, etc.) |

---

## `@repo/core` Structure

```
packages/core/src/
├── env/
│   └── env.ts           # @t3-oss/env-nextjs + Zod validation
├── logger/
│   └── logger.ts        # Structured console logger
├── errors/
│   └── index.ts         # BaseError hierarchy
├── response/
│   └── index.ts         # ApiResponse helpers
├── validation/
│   └── index.ts         # parseRequest, parseResponse, Zod helpers
├── repository/
│   └── base-repository.ts  # BaseRepository interface (no impl)
└── service/
    └── base-service.ts     # BaseService abstract class
```

---

## Environment Validation

Uses [`@t3-oss/env-nextjs`](https://env.t3.gg/) with Zod schemas.

| Variable | Scope | Required | Notes |
|----------|-------|----------|-------|
| `NODE_ENV` | Server | Yes (default: `development`) | Runtime environment |
| `NEXT_PUBLIC_APP_URL` | Client | Yes (default: `http://localhost:3000`) | Public app URL |
| `DATABASE_URL` | Server | Optional | Required when DB adapter is connected |
| `OPENAI_API_KEY` | Server | Optional | Required for AI features (Sprint 5) |
| `SUPABASE_URL` | Server | Optional | Required when Supabase adapter is connected |
| `SUPABASE_ANON_KEY` | Server | Optional | Required when Supabase adapter is connected |

Integration keys are **optional until their adapter is installed**. Format is validated when values are present.

```ts
import { env } from '@repo/core/env';

console.log(env.NEXT_PUBLIC_APP_URL);
```

Set `SKIP_ENV_VALIDATION=true` to bypass validation (CI/codegen only).

Copy `.env.example` to `.env.local` when connecting services.

---

## Logger

```ts
import { logger, Logger } from '@repo/core/logger';

logger.info('Server started', { port: 3000 });

const userLogger = logger.child('user-service');
userLogger.debug('Fetching user', { userId: '123' });
```

| Level | When to use |
|-------|-------------|
| `debug` | Development diagnostics |
| `info` | Normal operations |
| `warn` | Recoverable issues |
| `error` | Failures requiring attention |

In production, minimum level defaults to `info`. In development, `debug`.

---

## Error Handling

All application errors extend `BaseError`:

| Class | HTTP | Code |
|-------|------|------|
| `ValidationError` | 400 | `VALIDATION_ERROR` |
| `UnauthorizedError` | 401 | `UNAUTHORIZED` |
| `ForbiddenError` | 403 | `FORBIDDEN` |
| `NotFoundError` | 404 | `NOT_FOUND` |
| `ConflictError` | 409 | `CONFLICT` |
| `InternalServerError` | 500 | `INTERNAL_SERVER_ERROR` |

```ts
import { NotFoundError, isBaseError } from '@repo/core/errors';

throw new NotFoundError('User not found');
```

---

## API Response Format

Every API route returns a consistent envelope:

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "meta": { "timestamp": "2026-07-19T00:00:00.000Z" }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "User not found"
  }
}
```

```ts
import {
  createSuccessResponse,
  handleUnknownError,
} from '@repo/core/response';

export async function GET() {
  try {
    return Response.json(createSuccessResponse({ status: 'ok' }));
  } catch (error) {
    const apiError = handleUnknownError(error);
    return Response.json(apiError, { status: 500 });
  }
}
```

---

## Validation Flow

```
Request → parseRequest(schema, body) → Service → Repository → Adapter
                ↓ (on failure)
          ValidationError → ApiError response
```

```ts
import { z, parseRequest } from '@repo/core/validation';

const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().optional(),
});

const input = parseRequest(createUserSchema, await request.json());
// input is typed as { email: string; fullName?: string }
```

---

## Repository Pattern

`BaseRepository<TEntity>` defines the contract. No implementation in `@repo/core`.

```ts
import type { BaseRepository } from '@repo/core/repository';
import type { User } from '@repo/types';

// Sprint 3: SupabaseUserRepository implements BaseRepository<User>
class SupabaseUserRepository implements BaseRepository<User> {
  async findById(id: string) { /* Supabase SDK */ }
  async findAll() { /* ... */ }
  async create(data) { /* ... */ }
  async update(id, data) { /* ... */ }
  async delete(id) { /* ... */ }
  async exists(id) { /* ... */ }
  async count(filter) { /* ... */ }
}
```

Services receive repositories via constructor injection:

```ts
class UserService extends BaseService {
  constructor(
    logger: Logger,
    private readonly userRepo: BaseRepository<User>,
  ) {
    super(logger);
  }

  async getUser(id: string): Promise<User> {
    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundError('User not found');
    return user;
  }
}
```

---

## Service Layer

`BaseService` provides logging helpers. Services contain business logic only — no HTTP concerns, no SDK imports.

Rules:
- One service per domain entity (UserService, ProjectService)
- Services call repositories, not adapters directly
- Services throw `BaseError` subclasses; route handlers convert to `ApiResponse`

---

## Future Supabase Integration (Sprint 3)

```
packages/
└── db/                          # @repo/db (planned)
    ├── adapters/
    │   └── supabase/
    │       ├── client.ts        # Supabase client singleton
    │       └── user-repository.ts
    └── index.ts
```

Steps:
1. Create `@repo/db` package
2. Implement `SupabaseUserRepository implements BaseRepository<User>`
3. Wire env: `SUPABASE_URL`, `SUPABASE_ANON_KEY` become required
4. Register repositories in a DI container or factory
5. Services remain unchanged

Swapping to Prisma:
1. Create `PrismaUserRepository implements BaseRepository<User>`
2. Change factory registration
3. Services and API routes unchanged

---

## `@repo/types` Reference

| Module | Exports |
|--------|---------|
| `api` | `ApiResponse`, `ApiSuccess`, `ApiError`, `ApiErrorCode` |
| `pagination` | `PaginationParams`, `PaginatedResult`, defaults |
| `user` | `User`, `CreateUserInput`, `UpdateUserInput` |
| `role` | `Role`, `hasMinimumRole()` |
| `theme` | `Theme`, `ResolvedTheme` |

---

## `@repo/utils` Reference

| Module | Key functions |
|--------|---------------|
| `date` | `formatRelativeTime`, `addDays`, `parseISO` |
| `string` | `slugify`, `truncate`, `isEmail` |
| `number` | `clamp`, `formatBytes`, `percentage` |
| `array` | `unique`, `chunk`, `groupBy` |
| `object` | `pick`, `omit`, `compact` |
| `debounce` / `throttle` / `sleep` | Timing utilities |

---

## Dependency Graph

```mermaid
graph TD
  Web[apps/web] --> Core[@repo/core]
  Web --> Types[@repo/types]
  Web --> Utils[@repo/utils]
  Core --> Types
  DB["@repo/db (Sprint 3)"] --> Core
  DB --> Types
```

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-19 | Sprint 2-1 — Backend infrastructure foundation |
