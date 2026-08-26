# ALABOM Phase 1-B — Known Issues (Final CPO package)

```text
Date: 2026-08-26 (KI-1 Auth LIVE CDP final resume)
Head: see git main tip
CPO Final Review: HOLD — KI-1 only
```

## KI-1 — D2 Auth durable persistence (CEO / CPO gate) — STILL OPEN

| Field | Value |
|-------|--------|
| **Severity** | **Blocks CPO Final PASS** (HOLD sole reason) |
| **Matrix** | D2 Auth durable · Evidence #14 |
| **Status** | **OPEN — Auth LIVE NOT RUN** (session bridge blocked) |
| **Resumed 2026-08-26 (final)** | CDP bridge to CEO Chrome → regenerate storageState → Auth LIVE only |
| **Result** | **Operational blocker:** Chrome running **without** `--remote-debugging-port` |

### Checks (Auth LIVE)

| Check | Result |
|-------|--------|
| Login | **NOT RUN** |
| Existing project re-entry | **NOT RUN** |
| Understanding persistence | **NOT RUN** |
| Refresh → Memory persistence | **NOT RUN** |
| Logout → Login → project state | **NOT RUN** |

### Exact blocker (2026-08-26 CDP resume)

| Check | Result |
|-------|--------|
| Ports 9222 / 9229 / 9223 | **Not listening** (connection refused) |
| Chrome processes | **28** running (Default User Data) |
| Processes with `--remote-debugging-port` | **0** |
| Quit+relaunch with CDP | **Not performed** — active CEO session interference risk |
| `.qa-auth/storageState.json` | **Not regenerated** (prior file still expired) |
| Auth LIVE spec | **NOT RUN** (no valid storageState) |

**This is NOT a “CEO must Google login again” request.** CEO already confirmed 2 Google accounts can access Production. Blocker is **CDP attach**: need **one** Chrome relaunch with remote debugging so Playwright can `connectOverCDP` and export `storageState` from the existing Auth session.

**Operator step (once):** Quit Chrome → relaunch with `--remote-debugging-port=9222` and the same Default `--user-data-dir` → keep Production Auth workspace open → agent regenerates `apps/web/.qa-auth/storageState.json` via CDP → re-run only `e2e/alabom-phase1b-auth-live.spec.ts`.

Evidence: `auth-live-ki1-result.json`. Spec ready: `apps/web/e2e/alabom-phase1b-auth-live.spec.ts`.

### Demo-equivalent (already proven — not sufficient for HOLD close)

C1 LIVE Demo refresh: `media/13-refresh-persist.png` — does **not** replace Auth LIVE.

## Closed (not Known Issues)

- Product experience · LIVE Evidence 01–13/15–19 · Regression · Demo Persistence — CPO OK
- Auth LIVE (#14) — **OPEN** (this issue)
