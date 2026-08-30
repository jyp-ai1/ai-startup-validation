## CASE B Production Verification

### Production: commit, deploy time, URL, verification time

| Field | Value |
|-------|-------|
| **URL** | https://ai-startup-validation-tau.vercel.app |
| **Target commit** | `e8d32cf` (requested verification SHA) |
| **Live commit** | `84c31c9bc1222c8733e28553d3113f6d8411a1e2` (`84c31c9`) |
| **Deploy time** | 2026-08-30T23:41:23.394Z |
| **Verification time** | 2026-08-31T08:41:00+09:00 (KST) |
| **Overall verdict** | **BLOCKED** — QA auth refresh failed; resume payer chain not executed |

```
QA auth refresh failed
원인: apps/web/.qa-auth/storageState.json expired (mtime 2026-08-01); probe redirects to /auth/login. .qa-chrome-profile export lands on /demo/start (not Auth). Headed _capture-auth-storage.mjs opened Google OAuth identifier but cannot complete login without human — browser closed before /workspace.
CASE B 검증 중단
CPO HOLD 유지
```

---

### 1. Resume: FAIL, login redirect YES

| Check | Result |
|-------|--------|
| Resume existing workspace (NOT fresh demo) | **FAIL** — never reached authenticated workspace |
| Login redirect | **YES** — `/ko/workspace` → `/auth/login?next=%2Fworkspace` |

---

### 2. payer 질문: display FAIL, textarea FAIL

| Check | Result |
|-------|--------|
| Payer question visible (`누가 비용을 지불합니까?` or i18n variant) | **FAIL** — blocked at login |
| Textarea present | **FAIL** — not reached |

---

### 3. 답변: 고객이요 input FAIL, submit FAIL

| Check | Result |
|-------|--------|
| Input `고객이요` | **FAIL** — not reached |
| Submit answer | **FAIL** — not reached |

---

### 4. 상태 반영: payer gap OPEN (unverified)

| Check | Result |
|-------|--------|
| `semanticFactKey=buyer` | **N/A** — no turn captured |
| Payer gap | **OPEN** (unverified — resume chain not executed) |

---

### 5. 다음 질문: FAIL, repeat N/A

| Check | Result |
|-------|--------|
| Next question after payer answer | **FAIL** — not reached |
| Payer repeat count | **N/A** (0 required for PASS) |

---

### 5-row PASS table (CASE B resume)

| # | Criterion | Required | Actual | PASS |
|---|-----------|----------|--------|------|
| 1 | Resume workspace without login redirect | no redirect | redirect YES | ☐ |
| 2 | Payer question + textarea visible | both | not reached | ☐ |
| 3 | `고객이요` input + submit | both | not reached | ☐ |
| 4 | State: `semanticFactKey=buyer`, payer gap CLOSED | both | unverified | ☐ |
| 5 | Next question (not payer), repeat = 0 | both | not reached | ☐ |

**CASE B PASS:** 0/5 — **BLOCKED**

---

### 6. Evidence: screenshot paths, state JSON

| Artifact | Path |
|----------|------|
| Login redirect (expired storageState) | `case-b/01-resume-login-redirect.png` |
| Auth probe result | `case-b/auth-probe-result.json` |
| STEP 1 auth refresh log | `case-b/auth-step1-result.json` |
| CASE B transcript (blocked) | `case-b/transcript-raw.json` |
| Production build info | `prod-build-info.json` |

**Auth probe (2026-08-31T08:41:39+09:00):**

```json
{
  "url": "https://ai-startup-validation-tau.vercel.app/auth/login?next=%2Fworkspace",
  "onLogin": true,
  "onWorkspace": false
}
```

**STEP 1 scripts run (from `apps/web/`):**

1. `node scripts/_export-qa-storage-state.mjs` → landed `/demo/start`, `saved: false`
2. `node scripts/_probe-storage-state.mjs` → `/auth/login?next=%2Fworkspace`
3. `node scripts/_capture-auth-storage.mjs` → Google OAuth identifier, timeout/close, `saved: false`

**Unblocking:** Human must complete Google login via `node scripts/_capture-auth-storage.mjs` (headed, 180s wait), then re-run CASE B resume capture against a QA workspace with payer-open state.
