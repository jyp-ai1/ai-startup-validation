# ALABOM — DAY 8-I P0-11 Browser Journey Report (CPO 2nd)

**Date:** 2026-09-08 (08:10 UTC)  
**Branch:** `main`  
**Harness:** `apps/web/scripts/run-day8i-p0-11-browser-journey.mjs`

## Gate Status

```text
P0-11 Implementation       🟢 PASS (merged main)
R4 Lifecycle UI            🟢 FIXED + DEPLOYED
AUTH (this run)            🔴 NOT SET (bc-4e4afb06 legacy pod)
Browser R1~R5              ⏳ PENDING RE-RUN (auth-enabled agent)
CPO 2nd                   ⏳ PENDING
Production SHA             🟢 MATCH
CEO TEST                   🔴 HOLD
```

---

## R4 Fix Summary

**Root cause (prior run on `a3a72e8`):** `/workspace` project list on `main` had Create/Open only — no rename/archive/restore/delete UI.

**Fix (commit `0ca2fa4`):**
- Merged P0-11 branch → `main`: `MyProjectListItem` with ⋯ menu, rename/archive/restore/delete dialogs, archived section
- Added stable testids: `project-menu-{id}`, `project-rename-input`, `project-rename-save`, `project-archived-toggle`
- Harness R4: portal-safe menuitem selectors + state waits (not row-scoped)

---

## Production Gate

| Check | Value |
|-------|-------|
| Git SHA | `0ca2fa4bd803f6236105ce8566de123b6a8d66dc` |
| Build SHA | `0ca2fa4bd803f6236105ce8566de123b6a8d66dc` |
| Production SHA | `0ca2fa4bd803f6236105ce8566de123b6a8d66dc` |
| Deploy time | 2026-09-08T08:09:35.624Z |
| SHA match | ✅ **MATCH** |

| Smoke | Result |
|-------|--------|
| `GET /api/health` | ✅ 200 |
| `GET /build-info` commit | ✅ `0ca2fa4` |
| `GET /ko/workspace` | ✅ 200 |

---

## Browser Journey (This Run)

**Blocker:** `SUPABASE_SERVICE_ROLE_KEY: NOT SET` on agent `bc-4e4afb06` (legacy pod).

Harness **not executed** on this run. Prior authenticated run (`bc-b2094913`, SHA `a3a72e8`):

| Row | Prior Result | Notes |
|-----|--------------|-------|
| R1 | PASS | Real project + upload |
| R2 | PASS | Text-only |
| R3 | PASS | A/B isolation |
| R4 | **FAIL** | No lifecycle menu on old `main` |
| R5 | PASS | Logout/login persistence |

**Re-run required** on auth-enabled agent against `0ca2fa4` local or production.

---

## Expected Re-run Commands

```bash
env | grep '^SUPABASE_SERVICE_ROLE_KEY=' >/dev/null \
  && echo "SUPABASE_SERVICE_ROLE_KEY: SET" \
  || echo "SUPABASE_SERVICE_ROLE_KEY: NOT SET"

node apps/web/scripts/sync-qa-env.mjs   # hasServiceRoleKey: true
pnpm build
PORT=3333 pnpm exec next start --port 3333 &
node apps/web/scripts/run-day8i-p0-11-browser-journey.mjs
```

---

## Final Verdict (Pending Re-run)

```text
R1: PENDING
R2: PENDING
R3: PENDING
R4: PENDING (UI fix deployed — needs browser confirmation)
R5: PENDING

Overall: HOLD (browser re-run required on auth-enabled agent)
```

**Until R1~R5 = 5/5 PASS on `0ca2fa4`: CPO 2nd / CEO TEST remain HOLD.**
