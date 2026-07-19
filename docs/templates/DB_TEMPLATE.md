# Database Schema Template

> Add to `docs/DB.md` or `docs/schemas/TABLE_NAME.md`.

---

## Table: `[table_name]`

**Status:** Draft | Implemented  
**Sprint:** N  
**Adapter:** Supabase | Prisma | Other

### Purpose

What this table stores and why.

### Columns

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `created_at` | timestamptz | NO | now() | |

### Indexes

| Name | Columns | Unique |
|------|---------|--------|
| | | |

### RLS Policies (Supabase)

| Policy | Operation | Rule |
|--------|-----------|------|
| | SELECT | auth.uid() = user_id |

### Repository

```typescript
// Implements BaseRepository<EntityName>
class SupabaseXxxRepository implements BaseRepository<Xxx> {}
```

### Migration

```
packages/db/migrations/YYYYMMDD_create_xxx.sql
```

---

## Changelog

| Date | Change |
|------|--------|
| YYYY-MM-DD | Initial schema |
