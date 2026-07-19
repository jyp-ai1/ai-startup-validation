# Coding Guide

Conventions for human and AI contributors. Enforced via `.cursor/rules/coding-style.mdc` and ESLint/Prettier.

---

## TypeScript

- **Strict mode** always on — no implicit `any`.
- Prefer **interfaces** for object shapes; **types** for unions/intersections.
- Export shared types from `@repo/types`, not duplicated in apps.
- Use `as const` for literal unions (roles, themes, error codes).

## React & Next.js

- **Server Components** by default in `app/`.
- Add `'use client'` only for hooks, events, or browser APIs.
- Import UI from `@repo/ui` — never copy shadcn files into apps.
- Metadata in `layout.tsx`; page-specific metadata in `page.tsx`.

## Styling

- Tailwind utility classes; use `cn()` from `@repo/ui/lib/utils` for conditionals.
- Design tokens via CSS variables in `@repo/ui/globals.css`.
- No inline styles unless dynamic values cannot be expressed in Tailwind.

## Backend Patterns

```typescript
// Route handler
export async function POST(req: Request) {
  try {
    const input = parseRequest(schema, await req.json());
    const result = await userService.create(input);
    return Response.json(createSuccessResponse(result));
  } catch (error) {
    if (isBaseError(error)) {
      return Response.json(createErrorFromException(error), {
        status: error.statusCode,
      });
    }
    return Response.json(handleUnknownError(error), { status: 500 });
  }
}
```

## Imports

Order: external packages → `@repo/*` → `@/` → relative.

```typescript
import { z } from 'zod';

import { createSuccessResponse } from '@repo/core/response';
import type { User } from '@repo/types';

import { AppShell } from '@/components/app-shell';
```

## Formatting

- Prettier via `@repo/config/prettier`
- Single quotes, semicolons, trailing commas
- Run `pnpm format` before commit

## File Size

- Keep files focused; split when > 200 lines
- One component per file (except small colocated subcomponents)

## Comments

- Explain **why**, not what
- No commented-out code in merged PRs
- ADRs for architectural choices, not inline essays

## Related

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md)
- [TESTING.md](./TESTING.md)
