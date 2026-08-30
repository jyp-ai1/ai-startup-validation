# TTAEJYO P0 HOLD — Production A/B Verification @ `e8d32cf`

**Verified:** 2026-08-31 KST  
**Production URL:** https://ai-startup-validation-tau.vercel.app  
**Target SHA:** `e8d32cf` (fix(ttaejyo): answer surface + resume hydration)  
**Prior Production:** `44f6940`

---

## Phase 1 — Deploy poll

| Check | Result |
|-------|--------|
| `/api/build-info` commit | `e8d32cf7628a2c533cc97e56dd3133439461adeb` |
| Deploy confirmed | **YES** (already live at probe start; no wait required) |
| `prod-build-info.json` | Updated in this pass |

---

## Phase 2 — CASE A (Demo AI SaaS new workspace)

**Entry path:** `/ko/workspace?demo=guided&sample=saas&fresh=1`  
*(Direct URL — `_ttaejyo-p0-hold-capture.spec.ts` CASE A blocked on demo-start selector drift `AI SaaS` button.)*

| Step | Observation | Result |
|------|-------------|--------|
| Differentiation Q visible | `경쟁 대비 이 서비스만의 차별점은 무엇인가요?` | PASS |
| Textarea visible | `hasTextarea=true`, `hasSubmitCta=true` | PASS |
| Continue-only gate (`같이 확인하기`) | `continueCtaVisible=false` at differentiation | PASS |
| Submit answer | Submitted differentiation answer | PASS |
| Next question | `그 차별점이 고객에게 왜 중요한가요?` (different text) | PASS |

**CASE A verdict:** **PASS**

### Evidence

- `case-a/transcript-raw.json`
- `case-a/04-differentiation-question.png` — question + textarea
- `case-a/05-after-submit-next-q.png` — next question after submit

---

## Phase 3 — CASE B (login resume payer)

**Target chain:** Resume workspace → `누가 비용을 지불합니까?` → `고객이요` → `semanticFactKey=buyer` → payer CLOSED → no repeat

| Step | Observation | Result |
|------|-------------|--------|
| Auth storage | `apps/web/.qa-auth/storageState.json` present | EXISTS |
| Auth probe | Redirect to `/auth/login?next=%2Fworkspace` | **EXPIRED** |
| Export from `.qa-chrome-profile` | Landed on `/demo/start`, not authenticated workspace | **NOT SAVED** |
| Resume payer chain | Could not reach authenticated workspace | **BLOCKED** |

**CASE B resume verdict:** **BLOCKED — QA auth storage expired; resume path not live-verified**

### Blocker detail

```
Probe: node scripts/_probe-storage-state.mjs
→ url: https://ai-startup-validation-tau.vercel.app/auth/login?next=%2Fworkspace
→ onLogin: true

Export: node scripts/_export-qa-storage-state.mjs
→ url: https://ai-startup-validation-tau.vercel.app/demo/start
→ saved: false (no valid session)
```

### Supplementary (not resume scope)

Fresh-demo payer automation (`/ko/demo/start`, custom seed) did not reach payer question within nav budget in this pass (confirm flow advanced but payer slot not hit in 12 turns). Prior fresh-path engine evidence at `2c551a3` (`ceo-second-loop/case-b`) remains authoritative for payer semantics; **resume hydration fix requires authenticated re-capture**.

### Evidence

- `case-b/transcript-raw.json` — resume BLOCKED record
- `case-b/01-workspace-entry.png` — login redirect screenshot
- `case-b/fresh-ko-transcript-raw.json` — inconclusive fresh fallback

---

## Summary

| Case | Verdict | Notes |
|------|---------|-------|
| **A** — Demo AI SaaS differentiation surface | **PASS** | Textarea visible; submit advances to next Q |
| **B** — Login resume payer | **BLOCKED** | Auth expired; resume chain not executed |

---

## CPO report (this pass)

> Production SHA `e8d32cf` confirmed. CASE A: answer surface visible → submit → next Q **PASS**. CASE B: resume payer → **BLOCKED** (QA auth expired; `.qa-auth/storageState.json` redirects to login). Fresh payer re-capture inconclusive this pass.

**Not declaring CPO PASS** — CASE B resume live verification pending auth refresh.

---

## Artifacts

```
ttaejyo-p0-hold/
├── PRODUCTION_AB_VERIFICATION.md
├── prod-build-info.json
├── case-a/
│   ├── transcript-raw.json
│   ├── 01-after-load.png
│   ├── 02-after-confirm.png
│   ├── 04-differentiation-question.png
│   └── 05-after-submit-next-q.png
└── case-b/
    ├── transcript-raw.json
    ├── fresh-ko-transcript-raw.json
    └── 01-workspace-entry.png
```
