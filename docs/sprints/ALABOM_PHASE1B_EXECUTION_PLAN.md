# ALABOM Phase 1-B — Execution Plan

```text
🟢 LONG SPRINT — EXECUTING
No mid Freeze · No mid Scope Review · No Phase split
Next CPO report = Final package only (unless escalation §29)
Baseline history: 6d9b8b7 · d6d0e91 · ea11e70 (reference only — not Freeze)
Sprint identity: ALABOM — AI Business Validation Experience v1
```

**Date:** 2026-08-25  
**From:** CTO  
**Document type:** Execution Plan (workstreams, gates, QA/Evidence mapping)  
**Authority:** [`ALABOM_PHASE1B_SCOPE.md`](./ALABOM_PHASE1B_SCOPE.md)  
**Companion progress (optional):** [`ALABOM_PHASE1B_PROGRESS.md`](./ALABOM_PHASE1B_PROGRESS.md)

---

## 1. Purpose

Translate the Long Sprint SCOPE into an **internal implementation sequence**. This plan **authorizes continuous implementation** under Phase 1-B. There is **no** mid-sprint Freeze gate and **no** mid Scope Review.

---

## 2. Gate sequence (locked)

```text
SCOPE + this EXECUTION_PLAN (docs once)
        ↓
Long implementation (workstreams W1–W12)  ← YOU ARE HERE
        ↓
Internal QA (Matrix A–F)
        ↓
Production QA
        ↓
Evidence Package 01–20
        ↓
CTO Final Report
        ↓
CPO Review — Final package only (PASS / FIX / HOLD once)
        ↓
CEO Walkthrough A + B
```

**Mid-sprint CPO contact:** escalation §29 only (blocker / unauthorized contract break / scope change). No feature-by-feature approvals. No Phase 1-B.1 / 1-C splits.

---

## 3. Workstreams W1–W12 (execution order)

| ID | Workstream | SCOPE anchors | Priority notes |
|----|------------|---------------|----------------|
| **W1** | **Brand & Entry** — Concept 3 Progressive Loop logo + favicon · BrandConfig / metadata / OG · LaunchLens residual purge on branded surfaces · New User · Landing→Workspace branch | Brand · §31–§32 · Entry | **First visible win** |
| **W2** | **Document Understanding** — Upload · Quality · Journey A bans · no filename-as-name · never full re-entry after weak PDF | §2 · Document pipeline | |
| **W3** | **Understanding Engine** — Domain 01–20 · Provenance · Confidence · unified contracts · **Memory/Persistence foundations** | §4–§7 · §26 · Persistence | |
| **W4** | **Spine UI** — Shared Understanding Spine ✔●○ · KNOWN / next | §15 | |
| **W5** | **Conversation / Question Loop** — one Q at a time · Question Priority · never re-ask Known | §10–§11 | |
| **W6** | **Answer → Processing → Update** — Answer Quality · Contradiction · staged Processing · Before→After | §8–§9 · §12–§13 | |
| **W7** | **Summary / Detail** | §14 | |
| **W8** | **Why / Correction / Follow-up** | §16–§17 | |
| **W9** | **Stage Transition** A–D gates (not answer-count) | §18–§19 | |
| **W10** | **Evidence-first Review** · Score supporting · **Hero CTA = 1** · Decision Fatigue | §21–§25 | |
| **W11** | **Validation handoff** + **Regression** S7 / S8 / S14 / S16 / S17 | §20 · Regression | |
| **W12** | **QA Matrix A–F** · Evidence 01–20 · CEO A/B guides · Final CPO package | QA · Evidence · DoD §30 | Closeout |

**Woven continuously (not separate Phases):** Memory/Persistence · Demo/Auth same contract · Loading/Error/Recovery · Mobile · A11y · Token/cost control.

**Identity rule:** W1–W12 are **internal workstreams under Phase 1-B**, not new Phase numbers.

---

## 4. Dependencies

```text
W1 Brand & Entry (Concept 3)
  └─→ W2 Document Understanding
        └─→ W3 Understanding Engine + Memory/Persistence
              ├─→ W4 Spine UI
              └─→ W5 Question Loop
                    └─→ W6 Answer / Processing / Contradiction
                          └─→ W7 Summary/Detail
                                └─→ W8 Why / Correction / Follow-up
                                      └─→ W9 Stage Transition
                                            ├─→ W10 Evidence-first Review + Hero=1
                                            └─→ W11 Validation + Regression
                                                  └─→ W12 QA / Evidence / Final CPO
```

| Depends on | Workstream |
|------------|------------|
| — | W1 |
| W1 | W2 (entry paths) |
| W1 + W2 | W3 Journey A E2E foundations |
| W3 | W4, W5 |
| W5 | W6 |
| W6 | W7, W8 |
| W7–W8 | W9 |
| W9 | W10, W11 |
| W2–W11 | W12 |

**Parallelism:** After W3 contracts stable, Spine (W4) may parallel early Question work (W5) if state ownership stays single. Prefer sequential coherent ownership of shared Understanding state.

---

## 5. Acceptance criteria per workstream

### W1 — Brand & Entry (Concept 3 Progressive Loop)

- [ ] Logo icon: continuous lowercase **al** loop, orange→coral/red gradient  
- [ ] Wordmark: **ALABOM** (bold black sans) + **알아봄** where wordmark is shown  
- [ ] Favicon: same **al** loop on light gray rounded square  
- [ ] Assets under `apps/web/public/` (and/or brand folder); wired via `BRAND_CONFIG`  
- [ ] Metadata / OG / manifest / icons updated; LaunchLens residual strings removed on branded surfaces  
- [ ] Theme copy vibe: Progressive Loop / Shared Understanding Spine — trust + one step ahead  
- [ ] New User + Landing→Workspace branch (no Landing redesign)

### W2 — Document Understanding

- [ ] Journey A sequence + absolute bans — including **no “type it manually”** after weak PDF  
- [ ] Show what was understood + gap Q only  
- [ ] **No filename-as-business-name**  
- [ ] Document Quality classes covered  

### W3 — Understanding Engine + Memory/Persistence

- [ ] Domain 01–20 as fields (skip Known) — not a 20-Q form  
- [ ] Provenance: DOCUMENT, USER_CONFIRMED, USER_CORRECTED, AI_INFERENCE, EXTERNAL_EVIDENCE, UNKNOWN  
- [ ] Confidence: UNKNOWN → INFERRED → PROPOSED → USER_CONFIRMED → VALIDATED; **inference ≠ fact**  
- [ ] Turn pipeline Q→Answer→Memory→Understanding→UI  
- [ ] Bag sync + refresh persistence matrix  

### W4 — Spine UI

- [ ] Understanding Spine ✔●○; skip Known  
- [ ] User sees what is KNOWN and what is next  

### W5 — Question Loop

- [ ] One question at a time  
- [ ] Priority: Contradiction → Critical Unknown → Detail → Optional  
- [ ] Never re-ask Known / VALIDATED (unless Contradiction / user edit)  

### W6 — Answer / Processing / Contradiction

- [ ] Answer Quality enum; no PASS by length  
- [ ] Contradiction never silent overwrite; blocks Transition  
- [ ] Staged Processing (not fake); Before→After visible  

### W7 — Summary / Detail

- [ ] Summary primary; Detail not second Hero  

### W8 — Why / Correction / Follow-up

- [ ] Correction → USER_CORRECTED  
- [ ] 「왜?」 → Evidence → loop unbroken  

### W9 — Stage Transition

- [ ] Stages A–D; gates not answer-count  

### W10 — Evidence-first Review + Hero

- [ ] Judgment → Evidence → Reasoning → Action  
- [ ] Score supporting only; **Hero CTA = 1**  

### W11 — Validation + Regression

- [ ] Validation handoff copy/behavior  
- [ ] S7 / S8 / S14 / S16 / S17 protect checklist; unauthorized breaks → escalate §29 only  

### W12 — Closeout

- [ ] QA Matrix A–F executed  
- [ ] Evidence 01–20 attached  
- [ ] CEO Walkthrough A+B guides ready  
- [ ] DoD §30 + Final CPO package  

**Demo/Auth:** same Understanding contract throughout; persistence lifetime may differ.

---

## 6. QA mapping (Matrix A–F)

| Workstream | Primary matrix cells |
|------------|----------------------|
| W1 | F3 chrome / brand surfaces; F1 entry |
| W2 | A1, A2, A3, A4 |
| W3 | C1, C2, C4 + provenance/confidence |
| W4 | B4 Spine visibility |
| W5–W6 | B1, B2, B3, A4, F2 |
| W7–W8 | B4, F2 |
| W9 | C3, E2 |
| W10 | E1, E4 |
| W11 | F4 + Validation |
| W12 | Full A–F; Demo D1 / Auth D2 |

**Rule:** Targeted QA while implementing; **one** full Internal QA batch at feature-complete — not per-workstream CPO reviews.

---

## 7. Evidence mapping (01–20)

| # | Primary | Notes |
|---|---------|-------|
| 01 | W2 | Strong PDF Document First |
| 02 | W2 | Weak PDF honesty + gap-only (no full re-entry) |
| 03 | W2 | No filename-as-business-name |
| 04 | W3 | Provenance labels (incl. AI_INFERENCE ≠ fact) |
| 05 | W3 | Confidence / skip re-ask |
| 06 | W6 | Contradiction (no silent overwrite) |
| 07 | W6 | Answer Quality rejects nonsense ✔-pass |
| 08 | W6 | Staged Processing |
| 09 | W6 | Before→After Understanding update |
| 10 | W4 / W7 | Summary / Detail + Spine |
| 11 | W9 | Stage Transition announce |
| 12 | W10 | Evidence First + Hero=1 |
| 13 | W3 | Memory bag sync + refresh |
| 14 | — | Demo vs Auth same contract |
| 15 | — | Review Start cannot + error (no silent fail) |
| 16 | — | Mobile order + Decision Fatigue |
| 17 | W1 | **Brand Concept 3** logo + favicon on branded surfaces |
| 18 | W8 | Correction / 「왜?」 loop unbroken |
| 19 | W11 | Validation handoff + S16/S17 regression note |
| 20 | W12 | CEO Walkthrough A+B readiness clip / checklist |

Live walkthrough required for core flows before CEO (01, 02, 06, 08, 09, 11, 12, 13, 15, 17 at minimum).

---

## 8. Regression plan (S7 / S8 / S14 / S16 / S17)

| Layer | Action |
|-------|--------|
| **During W3–W11** | Continuous smoke: Document First, confirm-before-ask, Thinking stages, one Hero, Final Review gate |
| **W11 formal** | Checklist sign-off vs baseline product contracts (`6d9b8b7` / `d6d0e91` history) |
| **Break policy** | Stop merge; **escalate §29** before landing unauthorized contract breaks |
| **QA** | Matrix F4 + targeted A1/B1/E4 reconfirm |

Presenter/Flow changes OK. Unauthorized **state contract** breaks = escalate only. Do **not** invent Phase 1-C.

---

## 9. Rollback strategy

| Trigger | Action |
|---------|--------|
| S16/S17 Document First / Thinking / Hero break | Revert; restore prior Workspace loop |
| Memory bag sync regression | Roll back Memory/Understanding write path; re-run C4 |
| Fake Processing / silent Review Start fail | Hotfix or rollback; P0 honesty |
| Scope creep (new provider / score model / Landing redesign) | Revert OUT work — **no Phase split** |
| Prod outage / auth / cost spike | Stop AI-costly paths; constitution Stop rules |

---

## 10. Cost control / token discipline

| Rule | Practice |
|------|----------|
| Search → Change → Targeted Test → Verify | No full-repo reanalysis |
| Related files only | No speculative multi-agent OUT scans |
| Fixtures / Mock for AI where possible | Real AI only for core acceptance |
| No full Playwright suite until gate | Targeted tests while building |
| No evidence spam until near end | Package 01–20 at W12 |
| Cache Understanding; skip VALIDATED re-prompts | Product + CTO discipline |

---

## 11. Reporting rule

| When | Report to CPO? |
|------|----------------|
| Mid-implementation | **Only** §29 escalation |
| Feature-complete + QA + Evidence | **One** Final Gate package (DoD §30) |
| CEO Walkthrough | After CPO opens Final package — not self-opened |

**Forbidden:** Freeze claims; mid Scope Review; “approve W3?” loops; Phase 1-B.1 renumber to report done.

---

## 12. Operating order (now)

1. **Implement** W1→W12 (dependencies §4) — Brand Concept 3 first  
2. **Targeted QA** as you go; full Matrix at feature-complete  
3. **Production QA**  
4. **Evidence 01–20**  
5. **CTO Final Report**  
6. **CPO Final Review** once  
7. **CEO Walkthrough** A + B  

---

## 13. Explicit non-claims

- Does **not** create Phase 1-B.1 / 1-C  
- Does **not** claim Scope Freeze Candidate  
- Baseline SHAs preserved as **history** only  
- Does **not** invent new AI provider / score model / marketplace / auth redesign / G2  
- If conflict with SCOPE product language, **SCOPE Acceptance wins** until Final CPO amends  

---

## 14. Progress note

See [`ALABOM_PHASE1B_PROGRESS.md`](./ALABOM_PHASE1B_PROGRESS.md) for session-level shipped vs remaining. Status remains **EXECUTING** until DoD §30 met end-to-end.

---

*Next Autonomous Target: continue W1→W12 implementation; Final CPO only at package. Baseline history: 6d9b8b7.*
