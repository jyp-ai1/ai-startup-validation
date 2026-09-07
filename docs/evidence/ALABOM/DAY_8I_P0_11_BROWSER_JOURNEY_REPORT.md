# ALABOM — DAY 8-I P0-11 Browser Journey Report (CPO 2nd)

> **Actual browser evidence for R1~R5.** Code/unit evidence alone is insufficient for CPO 2nd PASS.

**Date:** 2026-09-07  
**Branch:** `cursor/day8i-p0-11-workspace-intake-6423`  
**Local build:** `http://127.0.0.1:3333` (P0-11 branch)  
**Production:** `https://ai-startup-validation-tau.vercel.app` (P0-11 **not deployed** — SHA `a3a72e8`)

## Executive Summary

| Gate | Verdict |
|------|---------|
| P0-11 implementation | ✅ PASS |
| CTO 1st (build + unit) | ✅ PASS |
| **CPO 2nd Browser R1~R5** | ⏳ **PENDING** — auth automation blocked |
| Production deploy | ⏸ HOLD |
| CEO TEST | 🔴 HOLD |

**CPO 판정 수용:** Section 4 code-path evidence ≠ browser journey evidence. Mockup HTML screenshots from an earlier capture were **discarded** (invalid for gate).

## Blocker

Real-account browser journeys require **Supabase magic-link QA auth** (same pattern as `production-p0-2-final-batch.mjs`).

| Required secret | Status |
|-----------------|--------|
| `SUPABASE_URL` | ✅ Known (production client bundle) |
| `SUPABASE_ANON_KEY` | ✅ Known (production client bundle) |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ **Missing** in cloud agent environment |
| `QA_EMAIL` (optional) | Defaults to `cto-qa@launchlens.dev` |

Cursor environment setup action requested: **Supabase QA auth for P0-11 browser journeys**.

## Runnable Harness

```bash
# 1. apps/web/.env.local with Supabase keys (service role required)
# 2. Build + start P0-11 branch
cd /workspace && pnpm build
cd apps/web && PORT=3333 pnpm exec next start --port 3333 &

# 3. Run R1~R5
node scripts/run-day8i-p0-11-browser-journey.mjs
```

Output: `docs/evidence/ALABOM/p0-11-browser/p0-11-browser-journey.json` + `media/*.png`

## R1~R5 Audit Table (CPO 2nd)

| ID | Scenario | Input | UI Action | Actual Result | Expected | Verdict |
|----|----------|-------|-----------|---------------|----------|---------|
| **R1** | 신규 + 파일 업로드 | 주인집1 + brewery.txt | Create → Workspace → AI Understanding | ⏳ Not executed — auth blocked | Title ≠ business; 양조장 in Understanding | ⏳ PENDING |
| **R2** | 텍스트-only | 텍스트온리QA + description | Create → Understanding | ⏳ Not executed | Description in Understanding | ⏳ PENDING |
| **R3** | A/B 격리 | A=양조장, B=반찬 | A work → B → A re-entry | ⏳ Not executed | No cross-project bleed; real project IDs | ⏳ PENDING |
| **R4** | Lifecycle | rename/archive/delete | ⋯ menu dialogs | ⏳ Not executed | List reflects each action | ⏳ PENDING |
| **R5** | 재접속 | logout → login | Open project A | ⏳ Not executed | A state restored from DB | ⏳ PENDING |

## Real Browser Evidence Captured (non-mock)

| File | URL | What it proves |
|------|-----|----------------|
| `prod_r0_login.png` | production `/auth/login` | Real login surface; Google OAuth available |
| `prod_r0_guest_workspace.png` | production → demo redirect | Unauthenticated `/ko/workspace` → demo (not auth create) |
| `prod_demo_start_no_p0_11.png` | production `/demo/start` | Production lacks P0-11 auth create upload |
| `local_auth_login_real.png` | local `:3333/auth/login` | P0-11 branch login with Supabase public env; Google button **enabled** after rebuild |

Location: `/opt/cursor/artifacts/screenshots/p0-11/` (real screenshots only — mockups removed)

## Auth Script Probe (2026-09-07)

```json
{
  "script": "run-day8i-p0-11-browser-journey.mjs",
  "baseURL": "http://127.0.0.1:3333",
  "auth": {
    "pass": false,
    "error": "Missing SUPABASE_SERVICE_ROLE_KEY"
  },
  "localGoogleLoginEnabled": true
}
```

Full JSON: `docs/evidence/ALABOM/p0-11-browser/p0-11-browser-journey.json`

## FIX-10 Parity Note (R1)

R1 must verify on **real account** (not demo):

```text
프로젝트 이름: 주인집1  ≠  AI Understanding one-liner (양조장 사업)
```

Demo parity for **upload engine** is already proven; CPO 2nd requires **auth path** confirmation after service-role unblock.

## v2Demo naming (out of scope)

`onboardingContext.v2Demo.pastedContent` remains for this gate. Canonical rename tracked as future cleanup — not a P0-11 FAIL criterion per CPO.

## Next Step

1. Add `SUPABASE_SERVICE_ROLE_KEY` to cloud environment secrets  
2. Re-run `node scripts/run-day8i-p0-11-browser-journey.mjs`  
3. Update this table with real project IDs + PASS/FAIL per row  
4. CPO 2nd final PASS/FAIL  
5. Production deploy → Production smoke → CEO TEST GO
