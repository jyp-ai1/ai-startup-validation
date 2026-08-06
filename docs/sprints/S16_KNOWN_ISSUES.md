# S16 — Known Issues

**Sprint:** S16 UX Recovery  
**Authority:** CTO (RC package)  
**Sources:** `S16_UX_RECOVERY.md`, `S16_QA_REPORT.md`, Production Internal QA evidence  
**Classification:** Expected Behavior | Deferred (S17) | Confirmed Bug  
**CPO:** Implementation + Internal QA PASS · CEO Walkthrough HOLD pending gate open

---

## Expected Behavior

| ID | Item | Evidence / note |
|----|------|-----------------|
| E-1 | PDF Trust admits unread when client extraction has no body | P0-1: Trust “cannot read PDF body” / KO unread copy; intentional honesty — not overclaim |
| E-2 | Filename is not treated as business name | P0-1: `filenameAsBusiness=false`; `plan.pdf` ≠ business |
| E-3 | Empty / description-optional project seeds admit unknowns | P0-5: empty-seed “AI가 모릅니다”; Trust/Reading must not claim false confidence |
| E-4 | Shared Understanding confirm gate before first ask | P0-2: 「맞습니까?」 before textarea; returning mid-loop with turns skips re-confirm by design |
| E-5 | Pre-analysis progress is stage-first; % not primary | P0-3: no 0→60% jump; copy prioritizes stages |
| E-6 | Analysis presents 판단 → 근거 → Hero 1; score supporting | P0-4 / P1-3: score labeled supporting, not hero |
| E-7 | Review CTA is Start or one-line reason — never silent disabled | P0-6: `reviewBlocked.*` / start path |
| E-8 | 「아직 고민중」 preserves state (optional aligning path) | P1-1: not on post-confirm happy path; unit + design |

---

## Deferred (S17)

| ID | Item | Evidence / note |
|----|------|-----------------|
| D-1 | Legacy Playwright `s15-internal-qa` still asserts S15 flow (no S16 confirm step; EN Trust button regex) | QA-2/3 reds are **spec lag**, not product P0 fails — update specs in S17 |
| D-2 | Analysis judgment copy can read machine-like on some domains | `S16_UX_RECOVERY` P0-4 Known Issues |
| D-3 | Aligning UI only via NextStep continue-alignment (off happy path after confirm) | P1-1 / P1-2 design; optional path polish |
| D-4 | Client PDF text extraction remains limited on some browsers | Trust stays honest (E-1); richer extraction is S17+ |

---

## Confirmed Bug

| ID | Item | Evidence / note |
|----|------|-----------------|
| — | *(none open)* | P0-2 empty-main dead-end (LoopPanel park without parent `readingCompleted` sync) was **fixed** and re-verified on Production `61731d5` / tip `a13accf`. No open confirmed bugs at RC submit. |

---

## Production Trace

| Item | Value |
|------|-------|
| Production URL | https://ai-startup-validation-tau.vercel.app |
| Production SHA | `a13accf30776fb94061fcb7b30e255a50fd66222` |
| Deploy Time | `2026-08-06T01:33:58.524Z` |
| Build | PASS |
| QA | PASS |
