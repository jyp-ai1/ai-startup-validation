# ALABOM Phase 1-B — Execution Plan

```text
🟡 LONG SPRINT — Scope Expansion (CTO Work Order companion)
Status: NOT FREEZE — awaiting single CPO Scope Review with SCOPE
Implementation: HOLD until CPO Scope PASS
Baseline: d6d0e91
Sprint identity: ALABOM Phase 1-B — AI Business Validation Experience
```

**Date:** 2026-08-25  
**From:** CTO → CPO  
**Document type:** Execution Plan (workstreams, gates, QA/Evidence mapping)  
**Authority:** [`ALABOM_PHASE1B_SCOPE.md`](./ALABOM_PHASE1B_SCOPE.md) §§0–50  
**Constraint:** Docs-only this session. **No code, no build/test, no deploy.** Do **not** invent Phase 1-B.1 / 1-C. Everything stays under **Phase 1-B**.

---

## 1. Purpose

Translate the CTO Work Order (SCOPE) into an **internal implementation sequence** after CPO Scope **PASS**. This plan does **not** authorize implementation while status is HOLD.

---

## 2. Gate sequence (locked)

```text
SCOPE + this EXECUTION_PLAN
        ↓
ONE CPO Scope Review → PASS / FIX / HOLD
        ↓
[only if PASS] Long implementation (workstreams W1–W12)
        ↓
Internal QA (Matrix §43)
        ↓
Production QA
        ↓
Evidence Package 01–16 (§44)
        ↓
CTO Final Report
        ↓
CPO Review (PASS / FIX / HOLD once)
        ↓
CEO Walkthrough A + B (§45)
```

**Mid-sprint CPO contact:** blocker or **scope change** only. No piecemeal approval loops.

---

## 3. Workstreams (map to SCOPE §49)

| ID | Workstream | SCOPE anchors | §49 step |
|----|------------|---------------|----------|
| **W1** | Contracts lock — Understanding · Provenance · Confidence · Domain 01–20 | §4–§7, §5 | 1 |
| **W2** | Document pipeline — Upload · Quality · Journey A bans · no filename-as-name | §2, §29–§30 | 2 |
| **W3** | Memory + Persistence — bag sync closure · refresh matrix | §26–§27 | 3 |
| **W4** | Question · Answer Quality · Contradiction Engines | §8–§11 | 4 |
| **W5** | Processing + Understanding Update UX | §12–§13 | 5 |
| **W6** | Spine · Summary/Detail · Correction · Follow-up | §14–§17 | 6 |
| **W7** | Stage A–D · Transition · Validation handoff | §18–§20 | 7 |
| **W8** | Analysis / Review — Evidence First · Score supporting · Hero · Fatigue | §21–§25 | 8 |
| **W9** | New User · Landing→Workspace · New Project · Workspace UX / Nav | §31–§34, §36 | 9 |
| **W10** | Loading/Error/Review Start · Mobile · A11y · Performance · Cost discipline | §35, §37–§41 | 10 |
| **W11** | Regression harness — S7 / S8 / S14 / S16 / S17 | §42 | 11 |
| **W12** | QA Matrix · Evidence Package · CEO Walkthrough guides | §43–§46, §50 | 12 |

**Identity rule:** W1–W12 are **internal workstreams under Phase 1-B**, not new Phase numbers.

---

## 4. Dependencies

```text
W1 Contracts
  ├─→ W2 Document pipeline
  ├─→ W3 Memory + Persistence
  └─→ W4 Question / Answer / Contradiction
        │
        W2 + W3 + W4
          └─→ W5 Processing + Update UX
                └─→ W6 Spine / Summary / Correction / Follow-up
                      └─→ W7 Stage A–D + Transition + Handoff
                            └─→ W8 Analysis / Review Evidence First
                                  │
W9 (New User / Landing / New Project / UX) ── depends on W1; parallels W5–W7 after W4 stable
W10 (Error / Mobile / A11y / Perf / Cost) ── after W5–W8 surfaces exist; harden continuously
W11 Regression ── continuous from W3; formal gate before W12 sign-off
W12 QA / Evidence / CEO guides ── after W2–W11 feature-complete
```

| Depends on | Workstream |
|------------|------------|
| — | W1 |
| W1 | W2, W3, W4, W9 (contract portion) |
| W1 + W2 | Journey A E2E paths |
| W1 + W3 + W4 | W5 |
| W5 | W6 |
| W6 | W7 |
| W7 | W8 |
| W5–W8 (+ W9 flows) | W10 final pass |
| W3 + prior KEEP | W11 |
| W2–W11 | W12 |

**Parallelism (after W1):** W2 ∥ W3 ∥ W4 allowed if contract tests green. Do **not** open W8 before Transition gates (W7) are defined in product behavior.

---

## 5. Acceptance criteria per workstream

### W1 — Contracts

- [ ] Unified Understanding Engine language matches SCOPE §4  
- [ ] Domain 01–20 treated as fields (skip Known) — not a 20-Q form (§5)  
- [ ] Provenance enum: DOCUMENT, USER_CONFIRMED, USER_CORRECTED, AI_INFERENCE, EXTERNAL_EVIDENCE, UNKNOWN (§6)  
- [ ] Confidence ladder: UNKNOWN → INFERRED → PROPOSED → USER_CONFIRMED → VALIDATED; inference ≠ fact (§7)  
- [ ] No unauthorized S7/S8/S14/S16/S17 breaks  

### W2 — Document pipeline

- [ ] Journey A sequence + absolute bans (§2) — including **no “type it manually”** after weak PDF  
- [ ] Upload pipeline; **no filename-as-business-name** (§29)  
- [ ] Document Quality test set classes covered (§30)  
- [ ] Document First / no empty-form primacy (S17 P0-1 KEEP)  

### W3 — Memory + Persistence

- [ ] Turn pipeline Q→Answer→Memory→Understanding→UI (§26)  
- [ ] Bag sync criteria all PASS (no overwrite, key sync, stale prevent, reload, next-turn, stage move)  
- [ ] Persistence matrix §27  

### W4 — Engines

- [ ] Contradiction never silent overwrite; blocks Transition (§8)  
- [ ] Answer Quality enum VALID/PARTIAL/AMBIGUOUS/IRRELEVANT/CONTRADICTORY/UNKNOWN (§9)  
- [ ] Question Priority order locked (§10)  
- [ ] Generation uses Known+Confirmed+Inferred+Unknown+Contradiction+Stage (§11)  

### W5 — Processing + Update

- [ ] Staged Processing; no fake AI work as fact (§12)  
- [ ] Before→Answer→Processing→After visible (§13)  

### W6 — Spine / Summary / Correction / Follow-up

- [ ] Summary / Detail product-wide; Detail not second Hero (§14)  
- [ ] Understanding Spine ✔●○; skip Known (§15)  
- [ ] User Correction → USER_CORRECTED (+ Contradiction if needed) (§16)  
- [ ] 「왜?」 → Evidence → loop unbroken (§17)  

### W7 — Stages + Transition + Handoff

- [ ] Stages A Understanding / B Validation / C Risk / D Decision (§18)  
- [ ] Transition gates not answer-count (§19)  
- [ ] Validation handoff copy/behavior (§20)  

### W8 — Analysis / Review

- [ ] Analysis lenses present; scores not hero (§21, §23)  
- [ ] Evidence First: Judgement→Evidence→Reasoning→Action (§22)  
- [ ] Hero CTA = 1; Decision Fatigue KPIs (§24–§25)  

### W9 — Entry / Workspace chrome

- [ ] New User one min question (§31)  
- [ ] Landing → Workspace branch; no Landing redesign (§32)  
- [ ] Workspace UX priority order (§33)  
- [ ] Navigation = user journey, not AI internals (§34)  
- [ ] New Project = name + review type only; no 8-char barrier (§36)  

### W10 — Hardening

- [ ] Loading / Error / Empty / Retry; Review Start no silent fail (§35, §37)  
- [ ] Mobile order integrity (§38)  
- [ ] Accessibility minimum (§39)  
- [ ] Performance: no re-ask confirmed; no duplicate analysis (§40)  
- [ ] Token / cost discipline observed in Impl (§41)  

### W11 — Regression

- [ ] S7 / S8 / S14 / S16 / S17 protect checklist signed (§42)  
- [ ] Any break has explicit approval record  

### W12 — Closeout artifacts

- [ ] QA Matrix A1–F4 executed (§43)  
- [ ] Evidence 01–16 attached (§44)  
- [ ] CEO Walkthrough A+B guides ready (§45)  
- [ ] Sprint completion checklist (§46) + CPO Gate package (§50)  

---

## 6. QA mapping (SCOPE §43)

| Workstream | Primary matrix cells |
|------------|----------------------|
| W2 | A1, A2, A3, A4 |
| W3 | C1, C2, C4 |
| W4 | B1, B2, B3, A4, F2 |
| W5 | B1 (+ Processing visible in B/F evidence) |
| W6 | B4, F2 |
| W7 | C3, E2 |
| W8 | E1, E4 |
| W9 | F1, F3, D3/D4 chrome |
| W10 | E2, E3, D3, D4 |
| W11 | F4 (+ S16/S17 KEEP across A/B/D/E) |
| W12 | Full A1–F4 batch; Demo D1 / Auth D2 |

**Rule:** Run **one Internal QA batch** when feature-complete — not per-workstream CPO reviews.

---

## 7. Evidence mapping (SCOPE §44)

| Evidence # | Primary workstream | Notes |
|------------|--------------------|-------|
| 01 | W2 | Strong PDF Document First |
| 02 | W2 | Weak PDF honesty |
| 03 | W2 | No filename-as-business-name |
| 04 | W1 / W6 | Provenance labels |
| 05 | W1 / W4 | Confidence / skip re-ask |
| 06 | W4 | Contradiction |
| 07 | W4 | Answer Quality |
| 08 | W5 | Staged Processing |
| 09 | W5 | Before→After update |
| 10 | W6 | Summary / Detail / Spine |
| 11 | W7 | Stage Transition announce |
| 12 | W8 | Evidence First + Hero=1 |
| 13 | W3 | Memory + refresh |
| 14 | W9 / W10 | Demo vs Auth |
| 15 | W10 | Review Start cannot + error |
| 16 | W10 | Mobile + Decision Fatigue |

Live walkthrough required for core flows (01, 02, 06, 08, 09, 11, 12, 13, 15 at minimum before CEO).

---

## 8. Regression plan (S7 / S8 / S14 / S16 / S17)

| Layer | Action |
|-------|--------|
| **Pre-Impl** | Snapshot KEEP criteria from S16/S17 docs; S14 bag-sync acceptance list |
| **During W3–W7** | Continuous smoke: Document First, confirm-before-ask, Thinking stages, one Hero, Final Review gate |
| **W11 formal** | Checklist sign-off; compare against baseline behavior on `d6d0e91` product contracts |
| **Break policy** | Stop merge; escalate for **approval** before landing (§42) |
| **QA** | Matrix F4 + targeted A1/B1/E4 reconfirm |

Do **not** “fix” regressions by inventing Phase 1-C.

---

## 9. Rollback strategy

| Trigger | Action |
|---------|--------|
| Contract break on S16/S17 Document First / Thinking / Hero | Revert feature branch / release; restore prior Workspace loop behavior |
| Memory bag sync regression (S14 class) | Roll back merge touching Memory/Understanding write path; re-run C4 |
| Fake Processing / silent Review Start fail shipped | Hotfix or rollback; treat as P0 honesty defect |
| Scope creep (new provider / score model / Landing redesign) | Revert OUT work; return to Phase 1-B backlog item — **no Phase split** |
| Production outage / auth / cost spike | Stop AI-costly paths; follow product constitution Stop rules |

Prefer **revert commit / release rollback** over forward-fix that widens OUT scope.

---

## 10. Cost control / token discipline (mirror SCOPE §41)

| Rule | Practice |
|------|----------|
| Docs-first | No speculative multi-agent repo scans for OUT items |
| Targeted reads | Prefer existing S16/S17 / Phase 1-B docs; max minimal code peeks for naming |
| Fixtures over live LLM | Document Quality test set + Mock until value proven |
| No re-prompt confirmed | Cache Understanding; skip VALIDATED fields |
| Measurable calls | Log / budget cost-sensitive paths in Impl |
| Mid-sprint | Do not spend tokens on marketplace, dashboard, auth redesign, G2, new score model |

CTO development **itself** obeys the same discipline as the product cost controls.

---

## 11. Reporting rule

| When | Report to CPO? |
|------|----------------|
| Scope Expansion docs complete | This package (SCOPE + EXECUTION_PLAN) — **one Scope Review** |
| Mid-implementation | **Only** blocker or **scope change** |
| Feature-complete + QA + Evidence | **One** Final Gate package (§50 / SCOPE) |
| CEO Walkthrough | After CPO opens — not self-opened |

**Forbidden:** Piecemeal “approve W3?” loops; Freeze claims while status is LONG SPRINT expansion; inventing Phase 1-B.1 to report “done.”

---

## 12. After CPO Scope PASS — operating order

1. **Long implementation** W1→W12 (dependencies §4)  
2. **Internal QA** — full Matrix A1–F4  
3. **Production QA** — honesty on deploy target  
4. **Evidence** — Package 01–16  
5. **CTO Final Report**  
6. **CPO Review** — PASS / FIX / HOLD once  
7. **CEO Walkthrough** A + B  

Implementation remains **HOLD** until step 0 (Scope PASS) is explicit.

---

## 13. Explicit non-claims

- Does **not** start Phase 1-B implementation  
- Does **not** create Phase 1-B.1 / 1-C  
- Does **not** claim Scope Freeze  
- Baseline **`d6d0e91` preserved** as reference; this plan builds on it  
- Companion to SCOPE; if conflict, **SCOPE Acceptance language wins** until CPO amends  

---

## 14. CPO decision (Scope Review)

Reply with one of:

- **PASS** → lock SCOPE §§0–50 + this plan; allow Impl kickoff  
- **FIX** → list deltas; Implementation stays HOLD  
- **HOLD** → keep Implementation HOLD; no Impl  

---

*Record only — Next Autonomous Target: single CPO Scope Review on SCOPE + EXECUTION_PLAN; Implementation HOLD. Baseline: d6d0e91.*
