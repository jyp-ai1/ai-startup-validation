# ALABOM — P0 Authenticated Persistence Production E2E Report

**Date:** 2026-09-08  
**Type:** Production E2E verification only (no code changes)  
**CPO Prior:** Code Gate CLOSED @ `ba14a8f`  
**Production SHA:** `1c9b919` (includes evidence doc; persistence code @ `ba14a8f`)  
**Production URL:** https://ai-startup-validation-tau.vercel.app

---

## Executive Summary

| Scenario | Result |
|----------|--------|
| Demo correction — no `/auth/login` redirect | 🟢 **PASS** |
| Authenticated correction → persist → refresh | 🔴 **BLOCKED** |
| Authenticated reopen | 🔴 **BLOCKED** |
| Project A/B isolation (auth) | 🔴 **BLOCKED** |
| Production SHA match | 🟢 **PASS** |

**CEO TEST:** 🔴 **HOLD** — authenticated Production E2E not executed (OAuth session unavailable on agent pod).

---

## Production SHA

| Item | Value | Status |
|------|-------|--------|
| Persistence fix commit | `ba14a8f` | Code CLOSED |
| Production `/api/build-info` | `1c9b9199230d16cdcbc60736d75b6f7ef3d8359e` | ✅ |
| Deploy time | 2026-09-08T16:01:34Z | — |
| Environment | production | ✅ |

---

## Scenario 1–4: Authenticated E2E — BLOCKED

### Blocker

```text
apps/web/.qa-auth/storageState.json — NOT PRESENT
```

Google OAuth session cannot be completed programmatically on cloud agent pod:

- Login UI: Google OAuth only (`/auth/login?next=/workspace`)
- Supabase email signup: blocked (invalid/test domain rejection)
- No `SUPABASE_SERVICE_ROLE_KEY` for magic-link QA user
- Prior diagnosis @ `2f05ae0` and P0-11 reports confirm same blocker

### Auth gate probe (Production)

| Step | Result |
|------|--------|
| Navigate `/ko/workspace` without session | Redirect → `/auth/login?next=%2Fworkspace` ✅ (expected) |
| storageState available | ❌ |
| Authenticated project create | 🔴 NOT RUN |
| Correction "영세 양조장" → persist | 🔴 NOT RUN |
| Hard refresh → correction 유지 | 🔴 NOT RUN |
| Reopen same project → 유지 | 🔴 NOT RUN |
| Project B → A correction absent | 🔴 NOT RUN |

**Evidence:** `media/d45bd.webp` — login redirect when accessing protected workspace without auth.

### Required to unblock

One of:

1. Valid `apps/web/.qa-auth/storageState.json` (CDP export from CEO/QA Chrome session)
2. CEO manual run of 5 auth scenarios on production @ `ba14a8f+`
3. Service-role magic link for internal QA account (not CEO test account)

---

## Scenario 5: Demo Regression — PASS

Verified on Production via browser walkthrough (2026-09-08 16:02–16:06 UTC).

### Flow

```text
/demo/start
  → "내 사업 문서로 제품하기"
  → paste 영세 양조장 B2B SaaS document
  → "AI Read 시작"
  → wait document reading complete
  → "아니요, 수정할게요"
  → customer: "고객은 일반 소상공인이 아니라 영세 양조장입니다."
  → "수정 반영"
  → URL: /workspace?demo=guided&sample=custom&fresh=1  ✅ (NOT /auth/login)
  → "맞습니다, 다음으로"
  → next question shown  ✅ (NOT /auth/login)
```

| Checkpoint | URL contains `/auth/login`? | Verdict |
|------------|----------------------------|---------|
| After "수정 반영" | ❌ No | ✅ PASS |
| After "맞습니다, 다음으로" | ❌ No | ✅ PASS |
| After advance to next Q | ❌ No | ✅ PASS |

**Evidence:**

| File | Content |
|------|---------|
| `media/82ae4.webp` | Understanding card — "아니요, 수정할게요" visible |
| `media/90cb8.webp` | After correction apply — still on demo workspace |
| `media/999ce.webp` | After confirm — next question, no auth redirect |
| `media/c1219.webp` | Build info — commit `1c9b919` |

Demo regression @ `4bd6b99` guard remains **CLOSED** on current production.

---

## Playwright Headless Note

Automated headless run timed out waiting for "아니요, 수정할게요" (120s) — document reading UX timing differs in headless vs headed browser. **Headed browser walkthrough PASS is authoritative** for demo regression this run.

---

## CPO Gate Matrix

| Gate | Status |
|------|--------|
| Code: domain/memory/entities snapshot | 🟢 CLOSED @ `ba14a8f` |
| Unit: round-trip + A/B isolation | 🟢 PASS |
| Build / Deploy / SHA | 🟢 PASS |
| Demo regression (production) | 🟢 PASS |
| Auth: correction → refresh → reopen | 🔴 **PENDING** |
| Auth: Project B isolation | 🔴 **PENDING** |
| Final Review | ⏸ frozen |
| **CEO TEST** | 🔴 **HOLD** |

---

## Verdict

```text
ba14a8f code Gate: CLOSED ✅
Production E2E (authenticated): BLOCKED 🔴
Demo regression: PASS ✅
CEO TEST: HOLD 🔴
```

**Do not hand to CEO** until authenticated refresh/reopen E2E passes on production.

**Next action:** Provide valid OAuth storageState OR CEO executes 5 auth scenarios manually — report evidence only, no scope expansion (loop debounce persistence remains out of scope).

---

## Operator Command (when storageState available)

```bash
cd apps/web
PLAYWRIGHT_BASE_URL=https://ai-startup-validation-tau.vercel.app \
  pnpm exec playwright test e2e/alabom-phase1b-auth-live.spec.ts --retries=0
```

Extend with correction "영세 양조장" + hard refresh + project B switch per CPO checklist.
