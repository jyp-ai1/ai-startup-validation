# ALABOM Phase 1-B
LONG SPRINT / SCOPE FREEZE CANDIDATE
Implementation: HOLD until CPO Freeze

**Date:** 2026-08-25  
**From:** CTO → CPO  
**Status:** **LONG SPRINT / SCOPE FREEZE CANDIDATE** · **Implementation HOLD** (NOT started)  
**Predecessor gates:** Phase 1-A / 1-A.1 **CLOSED** · Phase 1-B **IMPLEMENTATION HOLD** · **CEO HOLD**  
**Product track:** Workspace first-experience AI UX (ALABOM) — Product Experience Sprint on S16/S17 contracts; does **not** reopen brand Landing work.  
**Constraint:** Docs-only Scope Freeze Candidate. **No code, no deploy, no Phase 1-B impl, no S7–S17 contract changes** in this deliverable.

**Sources (prefer docs):**  
[`S17_SHARED_UNDERSTANDING_LOOP.md`](./S17_SHARED_UNDERSTANDING_LOOP.md) · [`S16_UX_RECOVERY.md`](./S16_UX_RECOVERY.md) · [`ALABOM_PHASE1A_REPORT.md`](./ALABOM_PHASE1A_REPORT.md) · [`ALABOM_PHASE1A_CPO_REVIEW.md`](./ALABOM_PHASE1A_CPO_REVIEW.md) · [`ALABOM_PHASE0_SCOPE_FREEZE.md`](./ALABOM_PHASE0_SCOPE_FREEZE.md) · `docs/PRODUCT_VISION_V3.md` · prior revision `b8673e5`

---

## Table of contents

1. [Sprint goal](#1-sprint-goal)
2. [Flow A — Document](#2-flow-a--document)
3. [Flow B — New User](#3-flow-b--new-user)
4. [Understanding Spine](#4-understanding-spine)
5. [AI Processing state](#5-ai-processing-state)
6. [Question quality rules](#6-question-quality-rules)
7. [Answer → Updated Understanding → Conclusion → Next Gap contract](#7-answer--updated-understanding--conclusion--next-gap-contract)
8. [Summary / Detail UX (product-wide pattern)](#8-summary--detail-ux-product-wide-pattern)
9. [AI conclusion vs user follow-up Q](#9-ai-conclusion-vs-user-follow-up-q)
10. [Stage transition](#10-stage-transition)
11. [Fixed stage spine ①–⑩ (skip known)](#11-fixed-stage-spine-①⑩-skip-known)
12. [Weak PDF honesty + gap-only Q](#12-weak-pdf-honesty--gap-only-q)
13. [Review screen (Decision Fatigue)](#13-review-screen-decision-fatigue)
14. [Scenarios A–F acceptance](#14-scenarios-af-acceptance)
15. [Deliverables Tracks A–E](#15-deliverables-tracks-ae)
16. [Explicit OUT](#16-explicit-out)
17. [Gate](#17-gate)

---

## Gate statement

```text
Phase 1-A / 1-A.1 CLOSED
        ↓
Phase 1-B Scope Review / Revision (prior docs; b8673e5)
        ↓
Phase 1-B LONG SPRINT / SCOPE FREEZE CANDIDATE  ← YOU ARE HERE
        ↓
CPO Freeze (awaiting)
        ↓
Implementation (blocked until Freeze)  ← still HOLD
        ↓
Internal QA → CTO Report → CPO → CEO Walkthrough
```

**Explicit:** Phase 1-B **implementation has NOT started.** This document is a **Scope Freeze Candidate** for one Product Experience Sprint — not a small UI sprint, not Product Spec (Spec comes **after** Freeze). Zero code in this deliverable.

---

## 1. Sprint goal

> **CPO (quote):** Phase 1-B is a **LONG Product Experience Sprint** that freezes the end-to-end Workspace AI PM journey — Document Flow and New User Flow sharing one **Understanding Spine** — so the founder always sees: what AI understood, what is missing, one next question, staged processing, live-updated understanding, stage progress, and a judgment-first Review with one Hero CTA. Scope is experience hardening on S16/S17, not new engines, scores, dashboards, or auth. Implementation stays **HOLD until CPO Freeze**.

**This sprint is:**

| Is | Is not |
|----|--------|
| One Product Experience Sprint (journey + contract + acceptance) | A small UI polish sprint |
| Scope Freeze Candidate (language lock for CPO) | Product Spec (deferred until after Freeze) |
| Experience hardening on S16/S17 baseline | Greenfield AI / provider / engine rewrite |
| Document + New User flows + shared spine | Landing redesign / brand restore |

---

## 2. Flow A — Document

**Intent:** User already has a plan/document. AI understands first. User **never** re-enters the whole form. **Never re-ask what is already in the doc.** When the document has facts, questions are **confirm-style** (맞나요?) — not open re-entry.

### Canonical sequence (locked)

```text
PDF
  → AI understand (parse / extract / draft)
  → Summary (AI가 이해한 내용)
  → [더보기] → Detail
  → Judgment / Conclusion (지금 이렇게 판단)
  → Gaps (부족한 것)
  → Confirm Q (문서 사실이 있으면 확인형)
  → Answer
  → Processing (staged; not spinner-only)
  → Updated Understanding
  → … (loop: Gap → Q → Answer → Processing → Update)
  → enough → market / remaining stages as needed
  → Review
```

### Hard rules

| Rule | Meaning |
|------|---------|
| **Never re-ask what’s in the doc** | Extracted / confirmed facts are Known — do not quiz them again as open questions |
| **Confirm-style when doc has facts** | 「문서에 ○○로 이해했습니다. 맞나요?」 not 「사업을 한 줄로 적어 주세요」 |
| **No full re-entry (FAIL)** | Empty full-form primacy after upload = **hard product FAIL** (preserves S17 P0-1 Document First) |
| **Gap-only after draft** | User input is uncertainty / contradiction / missing only |

**FAIL if:** After upload, the user is forced to re-enter full business fields, or Document Flow feels like “start the form over.”

---

## 3. Flow B — New User

**Intent:** No document. Minimal start. **AI chooses the next question** from Understanding gaps — **not** a fixed questionnaire / quiz order.

```text
minimal seed Q (이름 / 아이디어 수준)
  → Answer
  → Processing (staged)
  → Updated Understanding
  → AI chooses next Q from highest-priority Unknown / Gap
  → … (same Answer → Understanding → Conclusion → Next Gap contract)
  → enough → Review → next action
```

### Hard rules

| Rule | Meaning |
|------|---------|
| **AI chooses next Q** | Priority from Understanding Spine gaps — not a static form sequence |
| **Not Document Flow with blank PDF** | No fake “document read” confidence |
| **Admit unknowns** | Seed path is honest “AI가 모릅니다” (S16 P0-5), then gap-driven only |
| **Minimize cognitive load** | One question at a time; gradual build |

Shared spine after entry: same **Understanding Spine** + **Answer → Updated Understanding → Conclusion → Next Gap** contract + stage marks. Paths remain **user-obvious** and Acceptance-tested as distinct entries (Scenarios A–F).

### Two-flow comparison (CPO)

| | Flow A Document | Flow B New User |
|--|-----------------|-----------------|
| Start | document | minimal Q |
| AI role | document-first understand | answer-based initial understand |
| User input | gaps / uncertainty / confirm only | gradual minimal info |
| Question style | confirm when Known in doc; open for Unknown | AI-chosen Unknown / Gap |
| Core | minimize re-entry; never re-ask doc facts | minimize cognitive load; not fixed quiz |
| End | enough → Review | enough → Review |

---

## 4. Understanding Spine

**Central product state.** Not a side panel decoration — the spine the product turns on.

### Properties

| Property | Requirement |
|----------|-------------|
| **Central** | All Flows A/B, Processing, Stages, Review read/write this state |
| **Live updates on answer** | After each Answer → Processing → merge, spine fields update **before** next Q |
| **Visible** | User sees what changed (summary + highlight / Updated Understanding) |
| **Honest** | Known / New / Unknown / Contradiction are first-class (see §6) |
| **Stage-aware** | Stage ✔●○ derived from spine sufficiency + confirmation — not answer count |

### Baseline (light cite — do not rewrite contracts)

S17 already delivers Shared Understanding draft + loop reflect philosophy (`docs/sprints/S17_SHARED_UNDERSTANDING_LOOP.md` P0-1…P0-5; paths such as `build-shared-understanding.ts`, `apply-ai-pm-loop-answer.ts`, `workspace-ai-pm-thinking-stages.tsx`). Phase 1-B **hardens** Understanding Spine as the **explicit product state contract** end-to-end — not a new memory engine.

---

## 5. AI Processing state

**Staged, not spinner-only.**

After each Answer, the user must see **named stages of work**, not a lone indeterminate spinner that jumps to the next question.

### Required staged Processing (product language)

```text
Answer
  → Processing stage 1: Memory / 반영 중
  → Processing stage 2: Understanding update
  → Processing stage 3: Next Gap / next Q ready
  → Updated Understanding visible
  → next Q or stage advance announcement
```

| Allowed | Forbidden |
|---------|-----------|
| Staged labels tied to real work where possible (S17 P0-3 Thinking) | Spinner-only with no stage meaning |
| Visible duration of reflect before next Q | Silent jump to next quiz item |
| Same Processing chrome on Flow A and Flow B | Batch-all-inputs-then-analyze |

**Forbidden:** Collect many answers first, then one late analysis. Understanding must reflect **immediately** after each answer (§7).

---

## 6. Question quality rules

Classify each spine field / claim before asking:

| Class | Meaning | Question behavior |
|-------|---------|-------------------|
| **Known** | In doc or already confirmed | Do **not** re-ask open; skip or optional soft confirm only if needed for trust |
| **New** | Just learned this turn | Merge into spine; do not re-quiz |
| **Unknown** | Missing for current stage / judgment | **One** Unknown-driven Q at a time (highest priority) |
| **Contradiction** | Doc vs user, or answer vs prior | Resolve with one focused confirm / clarify Q — do not ignore |

### Rules (locked)

1. **One Unknown Q** — never multi-question walls; never fixed questionnaire dump.  
2. **Confirm vs open** — if facts exist (esp. Flow A), use **confirm-style**; if Unknown with no evidence, use **open** gap Q.  
3. **Never re-ask Known from the doc** (Flow A hard rule).  
4. **Nonsense / low-signal** — may save for audit honesty; **must NOT** ✔-pass the stage via polite “확인했습니다”; AI re-judges sufficiency → **re-ask** if insufficient.  
5. **No PASS by length** — no quiz-tick, no silent ✔.

---

## 7. Answer → Updated Understanding → Conclusion → Next Gap contract

**Phase 1-B core turn contract.** All Flow A / Flow B turns must use this locked shape.

```text
Answer
  → [AI Processing…] (staged; §5)
  → Updated Understanding (spine live update)
  → AI Conclusion (지금 이렇게 판단)
  → Next Gap (현재 부족한 부분)
  → one next Q   OR   stage advance announcement (§10)
```

### Expanded chrome (maps to UI roles)

```text
AI가 이해한 내용 → [더보기] → Detail
  → AI 판단/결론 → 현재 부족한 부분 → 질문
  → 사용자 답변 → Processing → Updated Understanding
  → 다음 질문 또는 다음 단계
```

**Deviating from this contract is out of Scope Freeze compliance.**

---

## 8. Summary / Detail UX (product-wide pattern)

**Product-wide pattern** — not a one-off Document Flow widget.

| Layer | Role |
|-------|------|
| **Summary** | Always visible short “AI가 이해한 내용” |
| **[더보기] → Detail** | Expand for evidence / field detail — **not** a second primary CTA |
| **AI Conclusion** | What AI believes is true *now* |
| **Gap** | What is still missing |
| **One primary CTA** | Next Q or next stage / Review Hero only |

**One composition job:** Summary for scan; Detail on demand; never force Detail as the only path. Same pattern on loop turns and Review (judgment + evidence ≤3 under Detail / evidence strip).

---

## 9. AI conclusion vs user follow-up Q

AI states a **Conclusion** (judgment now). User may challenge with follow-up (e.g. **「왜?」**).

```text
AI Conclusion
  → User: 「왜?」 / challenge
  → Evidence (≤3 bullets or Detail evidence)
  → back to Understanding Spine loop
       (confirm / contradict resolve / next Gap Q)
```

| Rule | Meaning |
|------|---------|
| Conclusion is visible | Not buried only in chat praise |
| 「왜?」 returns evidence | Then returns to loop — not a dead-end essay |
| Evidence capped | Prefer ≤3 evidence points (Decision Fatigue; §13) |
| No silent mock praise | Real pipeline or visible `[Sample]` (product constitution) |

---

## 10. Stage transition

### Marks

| Mark | Meaning |
|------|---------|
| **✔ 확인됨** | User confirmed **and** AI judged sufficient; stage may advance |
| **● 현재 확인 중** | Active — Processing / Question / awaiting confirm / re-ask after nonsense |
| **○ 아직 확인 전** | Not yet reached or insufficient confidence |

### Advance rules

- Advance when **enough** (confidence + confirmation + sufficiency) — **never** by answer count alone, never by polite ack alone.  
- On advance: **announce next stage** (user always knows what to do next — no dead end).  
- Nonsense keeps ● and re-asks; does not silently ✔.

---

## 11. Fixed stage spine ①–⑩ (skip known)

Canonical order for Phase 1-B Scope. Stages are **fixed**; AI **skips already-Known** (doc or confirmed) and lands on highest-priority Unknown / Contradiction.

| # | Stage | AI가 알고 있는 것 | 부족한 것 | 예시 다음 질문 | 완료 조건 |
|---|-------|-------------------|-----------|----------------|-----------|
| ① | **business** | 무엇을 하는지 | 모호한 카테고리/범위 | 확인형 또는 「이 사업은 한 문장으로?」 | 확인 + 비어 있지 않은 이해 문장 |
| ② | **customer** | 누구를 위한지 | 페르소나/지불자 | 「누가 돈을 내고 쓰나요?」 | 확인 + customer 확정 |
| ③ | **problem** | 고통/직무 | 깊이·빈도 | 「가장 아픈 점은?」 | 확인 + problem 확정 |
| ④ | **solution** | 제안 방향(있다면) | 차별 가설 | 「그 문제를 어떻게 풀어 주나요?」 | 확인 + solution 가설 |
| ⑤ | **market** | 시장 맥락 | 규모·진입 근거 | 「시장/채널은?」 | 확인 + market 근거 ≥1 |
| ⑥ | **competitor** | 대체재 인식 | 직접 경쟁·차별 | 「비슷한 선택지는?」 | 확인 + competitor 인식 |
| ⑦ | **revenue** | 수익 힌트 | 누가·어떻게 | 「돈은 어떻게 들어옵니까?」 | 확인 + revenue 초안 |
| ⑧ | **risk** | 리스크 후보 | 치명 우선순위 | 「가장 위험한 가정은?」 | 확인 + top risk 1 |
| ⑨ | **judgment** | 누적 Understanding | GO/HOLD 합의 | Final Review 「✓ 맞습니다」 | 전체 확인 |
| ⑩ | **next action** | 합의된 판단 | 실행 한 줄 | Review Hero CTA | next action 1개 |

**Skip known:** Flow A may enter mid-spine (e.g. ①–③ Known from PDF → start ● on first Unknown). Do not force walkthrough of ✔ stages.

**Freeze honesty:** Today’s S17 spine prioritizes business / customer / problem (± market/competitor). ④ solution / ⑦ revenue / ⑧ risk / ⑨–⑩ as first-class UI+status are **Scope targets** for Phase 1-B — not claimed already complete.

---

## 12. Weak PDF honesty + gap-only Q

When PDF extract is weak / partial / low confidence:

| Do | Do not |
|----|--------|
| Honest Trust / confidence (S17 Trust Block baseline) | Fake high “document read” confidence |
| Partial draft + confirm | Empty full-form primacy |
| **Gap-only Q** for Unknown / Contradiction | Full re-entry questionnaire |
| Confirm-style on thin Known | Pretend all stages are filled |

Weak PDF is still **Document Flow**, not New User Flow with a blank file. Honesty + gap-only is the FAIL boundary with §2.

---

## 13. Review screen (Decision Fatigue)

Final surface when spine is **enough**:

```text
Judgment (AI conclusion first)
  → Evidence ≤3
  → One Hero CTA
```

| Rule | Meaning |
|------|---------|
| **Judgment first** | Not a dashboard of widgets |
| **Evidence ≤3** | Cap cognitive load; more lives under [더보기]/Detail |
| **One Hero CTA** | Single primary next action (S16 P0-4 one Hero spirit) |
| **No multi-CTA hero row** | Decision Fatigue is a FAIL |

Review uses the same Summary / Detail pattern (§8). Exit Review = clear next action — Workspace user always knows **what to do next**.

---

## 14. Scenarios A–F acceptance

Use for Freeze / QA. All must PASS for Phase 1-B to exit Impl → Internal QA → CTO Report → CPO → CEO Walkthrough.

| ID | Scenario | PASS when |
|----|----------|-----------|
| **A** | **Strong PDF Document Flow** | PDF → understand → Summary → [더보기] Detail → Judgment → Gaps → Confirm Q → Answer → staged Processing → Updated Understanding → … → Review; **never** re-ask Known doc facts; no full re-entry |
| **B** | **Weak PDF** | Honest low confidence / Trust; partial draft; **gap-only** Q; still Document Flow (not blank-form primacy) |
| **C** | **New User (no doc)** | Minimal seed → AI-chosen next Q (not fixed quiz) → same turn contract → Review |
| **D** | **Nonsense / low-signal answer** | May save; does **not** ✔-pass; re-judge → re-ask; stage stays ● |
| **E** | **「왜?」 on AI Conclusion** | Evidence ≤3 (or Detail) → back to Understanding loop |
| **F** | **Stage skip + advance** | Known stages skipped (✔ or never ●); advance only when enough; **announce next stage**; Review = judgment → evidence ≤3 → one Hero CTA |

### Cross-cutting Acceptance checklist

- [ ] Flow A sequence locked (§2); no full re-entry FAIL  
- [ ] Flow B AI-chosen Q; not fixed questionnaire (§3)  
- [ ] Understanding Spine central + live on answer (§4)  
- [ ] Processing staged, not spinner-only (§5)  
- [ ] Known/New/Unknown/Contradiction → one Unknown Q; confirm vs open (§6)  
- [ ] Answer → Updated Understanding → Conclusion → Next Gap (§7)  
- [ ] Summary / Detail product-wide (§8)  
- [ ] Conclusion vs 「왜?」 evidence loop (§9)  
- [ ] ✔ ● ○ + advance when enough + announce (§10)  
- [ ] Spine ①–⑩ with skip known (§11)  
- [ ] Weak PDF honesty + gap-only (§12)  
- [ ] Review Decision Fatigue rules (§13)  
- [ ] Scenarios A–F all PASS (§14)

---

## 15. Deliverables Tracks A–E

This doc is the **Scope Freeze Candidate** only. **Product Spec** is authored **after** CPO Freeze — not in this deliverable.

| Track | Deliverable (post-Freeze Impl) | Now (this doc) |
|-------|--------------------------------|----------------|
| **A** | Flow A Document experience end-to-end | Scope language locked in §2, §12 |
| **B** | Flow B New User experience end-to-end | Scope language locked in §3 |
| **C** | Understanding Spine + Processing + turn contract + stage spine | Scope language locked in §4–§11 |
| **D** | Review (judgment → evidence ≤3 → one Hero) + Scenarios A–F QA | Scope language locked in §13–§14 |
| **E** | Product Spec + Internal QA pack + CTO Report template | **Deferred until after CPO Freeze** |

**Out of this Candidate:** writing full Product Spec, implementation, deploy, CEO Walkthrough.

---

## 16. Explicit OUT

Do **not** include in Phase 1-B Scope Freeze:

| OUT | Why |
|-----|-----|
| **New providers** | No new LLM / PDF / auth providers |
| **New engines** | No `businessPlan.generate` / orchestration spine rewrite |
| **New scores as primary UX** | No score-led product |
| **Marketplace** | Out of ALABOM Phase 1-B |
| **Dashboard / KPI widget walls** | Journey, not dashboards |
| **Auth structure changes** | High-risk; not this sprint |
| **G2 / Generation-2 contract breaks** | No reopen |
| **S7–S17 contract breaks** | Trust, confirm-before-ask, Document First, Thinking, one Hero, review gate — **KEEP**; experience language only |
| Multi-CTA per stage / Review | Decision Fatigue FAIL |
| Long forms / empty full-form after upload | Document Flow FAIL |
| Batch-all-inputs-then-analyze | Contract FAIL |
| LaunchLens brand restore | ALABOM display brand; `launchlens.*` storage keys **KEEP** |
| CartPilot / Platform SDK | Forbidden |
| Landing redesign beyond closed Phase 1-A / 1-A.1 | Closed |
| Phase 1-B **implementation** until CPO Freeze | **HOLD** |

---

## 17. Gate

```text
Scope Freeze Candidate (this doc)
  → CPO Freeze
  → Implementation          ← HOLD until Freeze
  → Internal QA
  → CTO Report
  → CPO
  → CEO Walkthrough         (HOLD until CPO opens)
```

| Item | Status |
|------|--------|
| Phase 1-A / 1-A.1 | **CLOSED** |
| Phase 1-B prior Scope Review / Revision | superseded by this **LONG SPRINT / SCOPE FREEZE CANDIDATE** |
| Phase 1-B Scope Freeze Candidate | **SUBMITTED** — awaiting CPO Freeze |
| Phase 1-B Scope Freeze | ⛔ awaiting CPO |
| Phase 1-B Implementation | ⛔ **HOLD** · **NOT started** |
| Product Spec (Track E) | ⛔ after Freeze only |
| CEO Walkthrough | **HOLD** |

### CPO decision needed

Reply with one of:

- **Freeze** → lock §§1–17 as Freeze input; only then allow Impl kickoff + Product Spec (Track E)  
- **수정** → list journey / contract / AC deltas (implementation still HOLD)  
- **HOLD** → keep Implementation HOLD; no Freeze  

---

## Baseline vs Gap (honest — light cite)

### Current baseline (do not rewrite contracts)

| Area | What already exists | Cite |
|------|---------------------|------|
| Document First / no empty-form primacy | S17 P0-1 PASS | `docs/sprints/S17_SHARED_UNDERSTANDING_LOOP.md` |
| Loop reflect + Thinking stages | Answer → Thinking → SU highlight | `workspace-ai-pm-thinking-stages.tsx`, S17 P0-2/P0-3 |
| Missing-field priority Q | customer / problem / business (+ diagnosis fallback) | `resolve-missing-field-priority.ts`, S17 P0-5 |
| Shared Understanding draft | business / customer / problem ± market / competitor | `build-shared-understanding.ts` |
| Confirm before first ask | S16 P0-2 | loop panel / main |
| Trust honesty on weak PDF | Trust Block | `workspace-document-trust-block.tsx` |
| Empty / no-doc start | Seed “AI가 모릅니다” | `build-empty-project-seed.ts`, S16 P0-5 |
| Final Review before Analysis | P1-3 | S17 |
| One Hero post-analysis | S16 P0-4 | `present-analysis-screen.ts` |

### What Phase 1-B still needs (honest gaps)

| Gap | Why it matters |
|-----|----------------|
| Full Flow A sequence as product chrome (Summary → Detail → Judgment → Gaps → Confirm → … → market/Review) | §2 acceptance |
| Flow B = AI-chosen Q, not questionnaire | §3 |
| Understanding Spine as central live state + Known/New/Unknown/Contradiction | §4–§6 |
| Processing staged (not spinner-only) enforced | §5 |
| Turn contract Answer → Updated Understanding → Conclusion → Next Gap | §7 |
| Summary/Detail product-wide; 「왜?」 evidence loop | §8–§9 |
| Stage ✔●○ + ①–⑩ skip known + announce | §10–§11 |
| Review Decision Fatigue (judgment → ≤3 evidence → one Hero) | §13 |
| Scenarios A–F QA pack | §14 |

**Bottom line:** S17 delivers the **philosophy**. Phase 1-B is a **LONG Product Experience Sprint** to freeze and then implement that experience — **not** a small UI sprint, **not** a new engine. **No S7–S17 contract rewrites** in this Candidate.

---

## Explicit non-claims

- **Zero product / UI / engine code changes** in this Scope Freeze Candidate session  
- **Phase 1-B Implementation NOT started** (HOLD)  
- **No S7–S17 contract changes** in this doc  
- This doc does **not** authorize Impl, deploy, Product Spec authorship as Freeze substitute, or CEO Walkthrough  

---

*Record only — Next Autonomous Target: CPO Freeze / 수정 / HOLD on this Scope Freeze Candidate; Implementation remains HOLD until Freeze.*
