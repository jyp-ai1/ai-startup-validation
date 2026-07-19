# Supabase Setup

Step-by-step guide to connect Supabase to the AI SaaS Starter Kit.

---

## 1. Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. **New Project** → choose org, name, region, password
3. Wait for provisioning (~2 minutes)

---

## 2. Get API Keys

**Project Settings → API**

| Key | Env variable | Notes |
|-----|--------------|-------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` | Also set `SUPABASE_URL` to same value |
| anon public | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Also set `SUPABASE_ANON_KEY` |
| service_role | `SUPABASE_SERVICE_ROLE_KEY` | **Never expose to client** |

---

## 3. Environment Variables

Copy `.env.example` to `apps/web/.env.local`:

```bash
cp .env.example apps/web/.env.local
```

Fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

> `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` are the same value.  
> Server code uses non-public vars; browser uses `NEXT_PUBLIC_*`.

Restart dev server after changing env.

---

## 4. Run Database Migration

1. Open **SQL Editor** in Supabase dashboard
2. Paste contents of `packages/db/src/migration/001_initial_schema.sql`
3. Click **Run**

Creates:

- `profiles` (linked to `auth.users`)
- `organizations`
- `projects`
- Triggers for auto-profile and `updated_at`

---

## 5. Storage Bucket

1. **Storage → New bucket**
2. Name: `assets`
3. Public or private per your needs (starter uses signed URLs for private)

Update bucket name in adapter if different (default: `assets`).

---

## 6. Auth Settings

**Authentication → Providers**

- Enable **Email** provider
- Configure **Site URL**: `http://localhost:3000` (dev)
- Add redirect URLs for password reset / email confirm

**Authentication → Email Templates** — customize as needed.

Email auth flows use `@repo/db` AuthPort — not direct SDK in apps.

---

## 7. Verify Connection

```bash
pnpm dev
```

Health check (no DB required):

```
GET http://localhost:3000/api/health
```

When Supabase is configured, test repository from a temporary API route or server script:

```typescript
import { getUserRepository } from '@/lib/db/platform';

const users = await getUserRepository().findAll();
```

---

## Local Development

### Option A: Supabase Cloud (recommended for Sprint 3)

Use cloud project with dev env vars — simplest setup.

### Option B: Supabase CLI (optional)

```bash
npx supabase init
npx supabase start
```

Use local URLs/keys from `supabase status` output.

### Without Supabase

Project builds and runs without env vars. Repository calls throw helpful errors when Supabase is not configured.

Set `SKIP_ENV_VALIDATION=true` for CI without credentials.

---

## Production

1. Create separate Supabase project (or branch) for production
2. Set env vars in Vercel/hosting dashboard
3. Run migration on production database
4. Update **Site URL** and redirect URLs to production domain
5. **Never** set `SUPABASE_SERVICE_ROLE_KEY` as `NEXT_PUBLIC_*`
6. Enable RLS policies (Sprint 4)

See [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## Generate TypeScript Types (optional)

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > packages/db/src/types/database.types.ts
```

Replace the placeholder types file with generated output.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails on env | Set `SKIP_ENV_VALIDATION=true` or add optional vars |
| `Supabase is not configured` | Check `.env.local` and restart dev server |
| RLS blocks queries | Expected until Sprint 4 — use service role for admin repos |
| Profile not created on signup | Verify trigger in migration SQL |

---

## Related

- [DATABASE_PLATFORM.md](./DATABASE_PLATFORM.md)
- [DB.md](./DB.md)
