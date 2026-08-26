# ALABOM Phase 1-B — Known Issues (Final CPO package)

```text
Date: 2026-08-26 (KI-1 Auth LIVE resume)
Head: see git main tip
CPO Final Review: HOLD — KI-1 only
```

## KI-1 — D2 Auth durable persistence (CEO / CPO gate) — STILL OPEN

| Field | Value |
|-------|--------|
| **Severity** | **Blocks CPO Final PASS** (HOLD sole reason) |
| **Matrix** | D2 Auth durable · Evidence #14 |
| **Status** | **OPEN — Auth LIVE not completed** |
| **Resumed 2026-08-26** | Playwright chromium-1228 installed; Auth LIVE re-run vs Production |
| **Result** | **FAIL at Login** — cannot prove Auth Persistence / Memory / Understanding LIVE |

### Checks (Auth LIVE)

| Check | Result |
|-------|--------|
| Login | **FAIL** (storageState → `/auth/login`) |
| Existing project re-entry | **FAIL** (blocked by Login) |
| Understanding persistence | **FAIL** (blocked by Login) |
| Refresh → Memory persistence | **FAIL** (blocked by Login) |
| Logout → Login → project state | **FAIL** (blocked by Login) |

### Exact credential blocker

| Check | Result |
|-------|--------|
| `.env` / process `E2E_*` · `TEST_USER*` · Auth password keys | **Absent** |
| `apps/web/.qa-auth/storageState.json` (gitignored) | **Present but expired/invalid** — Production `/ko/workspace` → `/auth/login` |
| `apps/web/.qa-chrome-profile` (gitignored) | **Present but not Auth** — `/demo/start` or Google sign-in wait timeout |
| Playwright browser revision | **FIXED** — `pnpm exec playwright install chromium` → `chromium_headless_shell-1228` |
| Demo substitute | **Forbidden** for KI-1 close |

**Blocker for CPO / CEO:** Complete Google login **inside** the headed `.qa-chrome-profile` window (or otherwise regenerate a valid `apps/web/.qa-auth/storageState.json` for Production). Then re-run only `e2e/alabom-phase1b-auth-live.spec.ts`.

Until then KI-1 **cannot** close honestly. Spec ready: `apps/web/e2e/alabom-phase1b-auth-live.spec.ts`. Evidence: `auth-live-ki1-result.json` · `media/14-auth-login-blocked.png`.

### Demo-equivalent (already proven — not sufficient for HOLD close)

C1 LIVE Demo refresh: `media/13-refresh-persist.png` — does **not** replace Auth LIVE.

## Closed (not Known Issues)

- Product experience · LIVE Evidence 01–13/15–19 · Regression · Demo Persistence — CPO OK
- Auth LIVE (#14) — **OPEN** (this issue)
