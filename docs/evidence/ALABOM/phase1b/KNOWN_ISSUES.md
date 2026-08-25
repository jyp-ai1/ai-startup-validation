# ALABOM Phase 1-B — Known Issues (Final CPO package)

```text
Date: 2026-08-26
Head: see git main tip
CPO Final Review: HOLD — KI-1 only
```

## KI-1 — D2 Auth durable persistence (CEO / CPO gate) — STILL OPEN

| Field | Value |
|-------|--------|
| **Severity** | **Blocks CPO Final PASS** (HOLD sole reason) |
| **Matrix** | D2 Auth durable · Evidence #14 |
| **Status** | **OPEN — Auth LIVE not completed** |
| **Attempted 2026-08-26** | Production Auth walkthrough via existing QA session artifacts |
| **Result** | **FAIL to start Auth session** — cannot prove Auth Persistence / Isolation / Memory / Understanding LIVE |

### Exact credential blocker (§29-style escalation to CPO)

| Check | Result |
|-------|--------|
| `.env` / process `E2E_*` · `TEST_USER*` · Auth password keys | **Absent** |
| `apps/web/.qa-auth/storageState.json` (gitignored) | **Present but expired/invalid** — Production `/ko/workspace` → `/auth/login` |
| `apps/web/.qa-chrome-profile` (gitignored) | **Present but not Auth** — Production → `/demo/start` (guest/demo) |
| Playwright e2e Auth fixtures / email-password login | **None** (Google OAuth only) |
| Demo substitute | **Forbidden** for KI-1 close — CPO HOLD requires Auth LIVE |

**Blocker for CPO:** Supply one of:

1. Fresh Production Google QA account (interactive login once), **or**
2. Regenerated `apps/web/.qa-auth/storageState.json` valid on `https://ai-startup-validation-tau.vercel.app`, **or**
3. Temporary Auth test path (magic link / service account) documented for agent use

Until then KI-1 **cannot** close honestly. Ready Auth walkthrough script: `apps/web/e2e/alabom-phase1b-auth-live.spec.ts`.

### Demo-equivalent (already proven — not sufficient for HOLD close)

C1 LIVE Demo refresh: `media/13-refresh-persist.png` — does **not** replace Auth LIVE.

## Closed (not Known Issues)

- Product experience · LIVE Evidence 01–13/15–19 · Regression · Demo Persistence — CPO ✅  
- Auth LIVE (#14) — **OPEN** (this issue)
