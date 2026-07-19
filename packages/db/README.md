# @repo/db

Hexagonal database platform — Supabase is one adapter among many.

## Usage

```typescript
import {
  getDatabasePlatform,
  DbTokens,
  type UserRepository,
} from '@repo/db';

const container = getDatabasePlatform();
const userRepo = container.resolve<UserRepository>(DbTokens.UserRepository);

// Or shorthand:
const { repositories } = container.platform;
await repositories.user.findById('uuid');
```

**Never import `@supabase/supabase-js` in apps** — only `@repo/db`.

## Structure

```
src/
├── auth/           Auth port (interface)
├── storage/        Storage port
├── realtime/       Realtime port
├── repositories/   Supabase repository implementations
├── adapters/supabase/  Client factory + adapter impls
├── di/             Dependency injection container
├── env/            Supabase environment validation
├── migration/      SQL migrations
└── seed/           Seed scripts
```

See [DATABASE_PLATFORM.md](../../docs/DATABASE_PLATFORM.md) and [SUPABASE_SETUP.md](../../docs/SUPABASE_SETUP.md).
