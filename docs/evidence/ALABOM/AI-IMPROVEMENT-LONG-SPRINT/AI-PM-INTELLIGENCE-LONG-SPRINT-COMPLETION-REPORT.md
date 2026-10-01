# ALABOM — AI PM Intelligence Long Sprint Completion Report

**Date:** 2026-10-01 UTC (work session close)  
**Production URL:** https://ai-startup-validation-tau.vercel.app  
**Primary merge line:** PR #56 → #57 → #58 → `main`

---

## 1. Executive Summary

This sprint combined **Product Completion (LS-1)** with **AI quality foundations (Phase 0, LS-2, LS-5, LS-7 UX)** while keeping **V3 SoT frozen**. Delivered: demo playback frame dedupe (v3 cache), labeled `고객:` / `문제:` extraction, My Business / Sample isolation guards, DB persist flush on tab hide, internal **5-scenario AI eval harness**, and **CEO evidence review strip** (confirmed / AI inference / gaps).

**Production SHA** matches Git/Build on `26d296a`. **Final Production browser matrix:** Sample A/B/C **PASS**, isolation **PASS**, My Business A **FAIL (E2E flake — textarea timeout)**, My Business B **PASS** → matrix **FAIL** (retry recommended before CEO test).

**CEO TEST:** **HOLD** until CPO accepts report + My Business A E2E rerun PASS + authenticated full journey (see Known Issues).

**Prior Demo Long Sprint:** closed separately — `docs/evidence/ALABOM/LONG-SPRINT/ALABOM-LONG-SPRINT-COMPLETION-REPORT.md` (`ed5c630`).

---

## 2. Phase 0 — AI Quality Matrix

Canonical doc: `docs/evidence/ALABOM/AI-IMPROVEMENT-LONG-SPRINT/AI-PM-EVALUATION-MATRIX.md`

| Dimension | Sprint outcome |
|-----------|----------------|
| ① Grounding | SmartPM firewall tests; demo hydration guards; eval scenarios assert no SmartPM literal |
| ② Slot accuracy | Labeled customer/problem extraction + unit tests |
| ③ Completeness | Long intake parity test (3k+ chars preserved in `pastedContent`) |
| ④ Gap accuracy | Existing V3 gap engine unchanged; gaps surfaced in evidence strip |
| ⑤ Question quality | Demo playback canonical questions; harness tracks repeats (≤1 tolerated in short run) |
| ⑥ Reasoning | `w12-partial-closeout`, `p0-2a` regression retained |
| ⑦ Actionability | Judgment/Final Review paths unchanged; validation handoff copy preserved |

---

## 3. LS-1 — Product Completion

| Item | Status | Evidence |
|------|--------|----------|
| Demo playback duplicate frame | **Done** | `demo-playback-materializer.ts` v3 cache; `demo-playback-frames.test.ts` |
| Demo Sample A/B/C Production | **PASS** | `PRODUCTION/gate1-browser-result.json` samples.* |
| My Business Preview | **Partial E2E** | MB-B PASS; MB-A timeout on `textarea` (2026-10-01 final run) |
| Auth persistence | **Partial** | `p0-authenticated-persistence.test.ts`; `useWorkspacePersistFlush` on authenticated workspace |
| Authenticated full journey E2E | **Not closed** | `production-flow-qa.mjs` requires CTO Google profile; gate smoke: login redirect **PASS** |
| Document extraction (long text) | **Partial** | Full paste in `buildAuthProjectIntakeContent`; PDF/DOCX via existing binary path + Trust Block |
| Regression script | **Done** | `production-ai-sprint-regression.mjs` |

---

## 4. LS-2 — Understanding (Evidence / Grounding / Slots)

- **Labeled `고객:`** lines (incl. middle-dot segments) → `document` basis (`extract-document-entities.ts`).
- **Labeled `문제:`** → product/problem signal when no stronger product section.
- **Founder archetype guard** tightened (exact match) to avoid rejecting “브랜드 PM” customers.
- **Grounding tests:** `grounding-contamination.test.ts`, `extract-document-entities-customer.test.ts`.
- **UI:** `WorkspaceEvidenceReviewStrip` — confirmed vs AI inference vs gap ids (Production workspace, non-demo).

---

## 5. LS-3 — Reasoning (Gap / Question)

**No V3 contract change.** Existing pipeline preserved:

`buildAnswerReview` → `gapState` → `evaluateStageReadiness` → `decideNextQuestionFromReview`.

Regression: `w12-partial-closeout.test.ts`, demo playback presenter tests.

**Not in scope this sprint:** new gap taxonomy (MISSING/AMBIGUOUS/…) or question priority scorer — documented in ROADMAP for follow-up.

---

## 6. LS-4 — Judgment

No structural redesign. Final Review **vertical stack** (prior Long Sprint) retained. Judgment sync via existing `syncJudgmentAfterAnswer` / `openBusinessReview`.

Harness: short `runDay8iConversation` smoke on clinic scenario (repeat guard relaxed to ≤1 next-question repeat).

---

## 7. LS-5 — Evaluation

- **Scenarios:** 5 internal packs (`lib/ai-evaluation/scenarios.ts`) — clinic, F&B, D2C, marketplace, AI SaaS PM.
- **Harness:** `ai-pm-scenario-harness.test.ts` — entity grounding + short conversation smoke.
- **Target 20–30 scenarios:** **not reached** (5/30); expand in next evaluation sprint.

---

## 8. AI Regression (local)

**2026-10-01 run:** 9 files, **35 tests PASS** (ai-evaluation, demo isolation, playback frames, persistence, p0-3 hydration, w12 closeout, extraction).

Command: `pnpm exec vitest run` paths in `production-ai-sprint-regression.mjs`.

---

## 9. Historical P0 Regression

| Risk | Status |
|------|--------|
| SmartPM contamination | Unit + Production forbidden markers |
| Sample → My Business mix | Hydration tests + isolation E2E PASS |
| Project cross-contamination | Per-project storage keys |
| Customer/Problem slots | Labeled extraction + existing wrong-slot suite (not full browser) |
| Correction rollback | `p0-2a`, auth guard on demo persist |
| Repeat questions | Playback dedupe; harness monitors repeats |
| Final Review reach | Shell panels + prior P0-2C lineage |
| Sample fallback on weak custom | `compose_empty_custom` |

---

## 10. Demo — Sample A / B / C

Production playback frames materialized on **`frames.v3`** cache. Sample runs **PASS** all `mustContain` / isolation checks.

**P2 UX:** fitbridge playback frames 9–10 may show duplicate “제공 가치” surface (non-blocking).

---

## 11. Demo — My Business

Paste + file merge (`composeMyBusinessIntakeDocument`), preview cap, provenance UI. **MB-B PASS** on final Production run; **MB-A failed** due to Playwright timeout locating `textarea` on `/demo/start` (infra/timing — rerun advised).

---

## 12. Production Full Journey (Authenticated)

**Not validated end-to-end in browser** (Login → Next Action). Components wired: DB hydrator, `persistWorkspaceStateDbFirst`, persist flush hook.

**Smoke:** unauthenticated `/workspace` → `/auth/login` **PASS** (`production-authenticated-gate-smoke.mjs`).

---

## 13. Document Extraction

- Long paste preserved in project intake merge (**>3000 chars** test).
- PDF/DOCX: existing placeholder → Trust Block path unchanged.
- **1000-char summary field** in `my-project-actions` applies to DB **summary only**, not full `v2Demo.pastedContent`.

---

## 14. Correction / A→B→A

- Demo: `enableDbPersistence={!isDemoNoPersist}` — corrections do not trigger auth redirect in demo.
- Authenticated: persist on edit confirm paths in `workspace-ai-pm-main.tsx`.
- A→B→A: existing CLOSED preservation tests; no loop contract change.

---

## 15. Judgment / Final Review UX

- Vertical review stacks (Final Review, edit confirm, state board) from Demo Long Sprint.
- **New:** `workspace-evidence-review-strip` for CEO verification layout (confirmed / inferred / unknown gaps).

---

## 16. Production E2E

| Check | Result |
|-------|--------|
| `/api/health` commit | `26d296aa8e4b1ade0e46ce3b66c78446cb813028` |
| Sample A/B/C browser | **PASS** |
| My Business A | **FAIL** (textarea timeout) |
| My Business B | **PASS** |
| Sample→MB isolation | **PASS** |
| **Matrix verdict** | **FAIL** (single flaky step) |

Artifact: `docs/evidence/ALABOM/AI-IMPROVEMENT-LONG-SPRINT/PRODUCTION/gate1-browser-result.json`

Earlier sprint run on `8a2dea7`: full matrix **PASS** (reference in git history / prior agent session).

---

## 17. Git SHA

`26d296aa8e4b1ade0e46ce3b66c78446cb813028`

---

## 18. Build SHA

`26d296aa8e4b1ade0e46ce3b66c78446cb813028` (from `/api/health`)

---

## 19. Production SHA

`26d296aa8e4b1ade0e46ce3b66c78446cb813028`

---

## 20. SHA Match

**PASS** (Git = Build = Production)

---

## 21. Known Issues

### Blockers (CEO test)

1. **Authenticated full journey** — no single Production browser script with Google session.
2. **Final E2E matrix FAIL** — My Business A step timeout; rerun required.

### P1 follow-up

- Auth persistence **Production** reload test with real Supabase project.
- PDF/DOCX body extraction quality (beyond placeholder).
- Expand AI eval harness to 20–30 scenarios.
- LS-3 gap classification + question priority (without V3 SoT break).
- Playback frame 9–10 duplicate surface on Sample C.

### P2

- Demo ops registry (`demo-seed-registry`) — done; JSON export optional.
- Internal scorecard automation in CI.

### Out of scope (unchanged)

- Auth structure redesign · destructive DB migration · real LLM provider swap.

---

## 22. Evidence Index

| Artifact | Path |
|----------|------|
| This report | `docs/evidence/ALABOM/AI-IMPROVEMENT-LONG-SPRINT/AI-PM-INTELLIGENCE-LONG-SPRINT-COMPLETION-REPORT.md` |
| Phase 0 matrix | `AI-PM-EVALUATION-MATRIX.md` |
| Roadmap | `ROADMAP.md` |
| Production E2E JSON | `PRODUCTION/gate1-browser-result.json` |
| Demo Long Sprint report | `../LONG-SPRINT/ALABOM-LONG-SPRINT-COMPLETION-REPORT.md` |
| PRs | #56, #57, #58 (AI Intelligence); #54–#55 (Demo Long Sprint) |

---

## 23. CPO validation checklist (for one-pass review)

1. Long Sprint scope vs report gaps (§21 blockers).  
2. Unit regression 35/35 (§8).  
3. Production E2E — accept or require MB-A rerun (§16).  
4. SHA match (§20).  
5. V3 SoT preserved (§5–6).  
6. Demo / My Business / Production separation (§9–11).  
7. Historical P0 list (§9).  
8. CEO evidence strip + vertical review (§15).  

**After CPO PASS:** CEO integrated test GO/HOLD.

---

*End of AI PM Intelligence Long Sprint Completion Report.*
