# @repo/feature-auth

Enterprise Authentication & Authorization Platform.

- **Authentication** → Supabase via `@repo/db` AuthPort
- **Authorization** → Permission Engine (owned by this package)

```typescript
import { permissionChecker, PERMISSIONS } from '@repo/feature-auth';

if (permissionChecker.canUser(user, PERMISSIONS.PROJECTS_WRITE)) {
  // allowed
}
```

See [AUTH_PLATFORM.md](../../docs/AUTH_PLATFORM.md).
