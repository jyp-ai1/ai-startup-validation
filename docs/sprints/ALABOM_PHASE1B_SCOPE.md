# ALABOM Phase 1-B — AI Business Understanding Engine & Experience

```text
🟡 LONG SPRINT — Scope Expansion Required
(NOT Scope Freeze Candidate — do not claim Freeze-ready)
```

**Implementation: HOLD** until CPO Scope Freeze (after this expansion cycle).

**Date:** 2026-08-25  
**From:** CTO → CPO  
**Status:** **LONG SPRINT — Scope Expansion Required** · **Implementation HOLD** (NOT started)  
**Predecessor gates:** Phase 1-A / 1-A.1 **CLOSED** · Phase 1-B **IMPLEMENTATION HOLD** · **CEO HOLD**  
**Prior Scope revision:** `ea11e70` (LONG SPRINT / SCOPE FREEZE CANDIDATE) — **CPO did NOT freeze**; verdict 🟡 Freeze deferred — Scope must expand further.  
**Product track:** Workspace first-experience AI UX (ALABOM) — one Understanding Engine & Experience Sprint on S16/S17 baseline; does **not** reopen brand Landing work.  
**Constraint:** Docs-only Scope Expansion. **No code, no build/test, no deploy, no Phase 1-B impl, no S7–S17 contract changes** in this deliverable.

**Sources (prefer docs language):**  
[`S17_SHARED_UNDERSTANDING_LOOP.md`](./S17_SHARED_UNDERSTANDING_LOOP.md) · [`S16_UX_RECOVERY.md`](./S16_UX_RECOVERY.md) · [`ALABOM_PHASE1A_REPORT.md`](./ALABOM_PHASE1A_REPORT.md) · [`ALABOM_PHASE1A_CPO_REVIEW.md`](./ALABOM_PHASE1A_CPO_REVIEW.md) · [`ALABOM_PHASE0_SCOPE_FREEZE.md`](./ALABOM_PHASE0_SCOPE_FREEZE.md) · S14/S15 ConversationMemory bag-sync pain (`S15_BACKLOG.md`) · `docs/PRODUCT_VISION_V3.md` · prior SHA `ea11e70`

---

## No mid-sprint Phase split (locked)

```text
Phase 1-B
 ├─ Product Contract
 ├─ Document Understanding
 ├─ New User Journey
 ├─ Shared Understanding
 ├─ Memory
 ├─ Question Engine
 ├─ Answer Processing
 ├─ Contradiction
 ├─ Confidence
 ├─ Stage Transition
 ├─ Review
 ├─ Persistence
 ├─ Demo/Auth
 ├─ UX
 ├─ QA
 └─ Production Validation
```

**Do not** renumber into Phase 1-C / 1-D mid-sprint. All workstreams above live **under Phase 1-B only**. This Sprint bundles Document Flow + New User Flow + Shared Understanding + AI conversation Loop + Review transition + UX + QA as **one engine, not two products**.

---

## Table of contents

1. [Sprint goal](#1-sprint-goal)
2. [Two entry points → one Shared Understanding Engine](#2-two-entry-points--one-shared-understanding-engine)
3. [Document Intelligence](#3-document-intelligence)
4. [Information Provenance](#4-information-provenance)
5. [Understanding Confidence](#5-understanding-confidence)
6. [Contradiction Handling](#6-contradiction-handling)
7. [Memory Architecture](#7-memory-architecture)
8. [AI Processing Experience](#8-ai-processing-experience)
9. [Question Engine](#9-question-engine)
10. [Answer quality judgment](#10-answer-quality-judgment)
11. [User Follow-up](#11-user-follow-up)
12. [Summary / Detail (product-wide)](#12-summary--detail-product-wide)
13. [Stage Model](#13-stage-model)
14. [Stage Transition Engine](#14-stage-transition-engine)
15. [Review Experience](#15-review-experience)
16. [Decision Fatigue KPI](#16-decision-fatigue-kpi)
17. [Resume / Refresh / Persistence](#17-resume--refresh--persistence)
18. [Demo / Authenticated](#18-demo--authenticated)
19. [Product UX surfaces](#19-product-ux-surfaces)
20. [QA Matrix](#20-qa-matrix)
21. [Deliverables (13)](#21-deliverables-13)
22. [Explicit OUT](#22-explicit-out)
23. [Gate](#23-gate)
24. [Baseline vs Gap (honest)](#24-baseline-vs-gap-honest)
25. [Explicit non-claims](#25-explicit-non-claims)

---

## Gate statement

```text
Phase 1-A / 1-A.1 CLOSED
        ↓
Phase 1-B Scope (ea11e70 Freeze Candidate) — CPO: Freeze deferred
        ↓
Phase 1-B LONG SPRINT — Scope Expansion Required  ← YOU ARE HERE
        ↓
CPO Scope Freeze (awaiting — after expansion accepted)
        ↓
Implementation (blocked until Freeze)  ← still HOLD
        ↓
Internal QA (one final batch) → CTO Report → CPO → CEO Walkthrough
```

**Explicit:** Phase 1-B **implementation has NOT started.** This document is a **Scope Expansion** for one AI Business Understanding Engine & Experience Sprint — **not** Scope Freeze Candidate, **not** Freeze-ready. Zero code in this deliverable.

---

## 1. Sprint goal

> 사용자가 가진 정보를 최대한 활용해 ALABOM이 먼저 사업을 이해하고, 부족한 정보만 대화로 확인하며, 답변할 때마다 이해 내용을 갱신하고, 충분히 구체화되면 사업성 검토로 자연스럽게 전환되는 전체 경험을 완성한다.

**This sprint is:**

| Is | Is not |
|----|--------|
| One LONG Product Experience Sprint: Understanding Engine + Journey | A small UI polish sprint |
| Document + New User → **one Shared Understanding Engine** | Two separate products / flows with divergent contracts |
| Scope Expansion for CPO (language must expand further) | Scope Freeze Candidate / Freeze-ready claim |
| Experience hardening on S16/S17 baseline | Greenfield AI / provider / engine rewrite |
| Full loop: understand → ask → update → transition → Review | Landing redesign / brand restore |

---

## 2. Two entry points → one Shared Understanding Engine

Both paths converge on the **same** Understanding / Memory / Question / Stage / Review contracts.

| | Entry A — Document | Entry B — New User |
|--|--------------------|--------------------|
| Start | PDF / plan document | Minimal seed Q (이름 / 아이디어 수준) |
| AI role | Document-first understand | Answer-based initial understand |
| User input | Gaps / uncertainty / confirm only | Gradual minimal info |
| Question style | Confirm when Known in doc; open for Unknown | AI-chosen Unknown / Gap |
| Core | Minimize re-entry; never re-ask doc facts | Minimize cognitive load; not fixed quiz |
| Engine | **Shared Understanding Engine** | **Shared Understanding Engine** |
| End | Transition when Sufficient → Review | Transition when Sufficient → Review |

### Flow A — Document (canonical sequence)

```text
PDF
  → AI understand (parse / extract / draft)
  → Document Intelligence surface (what doc said / missing / contradiction)
  → Summary (AI가 이해한 내용)
  → [더보기] → Detail (facts + provenance + judgment + uncertainty)
  → Judgment / Conclusion (지금 이렇게 판단)
  → Gaps (부족한 것)
  → Confirm Q (문서 사실이 있으면 확인형)
  → Answer
  → Processing (staged; real work only — §8)
  → Updated Understanding
  → … (loop: Gap → Q → Answer → Processing → Update)
  → Stage Transition Engine (enough) → Validation / Review
```

**Hard rules (Document):**

| Rule | Meaning |
|------|---------|
| **Never re-ask what’s in the doc** | Extracted / confirmed facts are Known — do not quiz as open questions |
| **Confirm-style when doc has facts** | 「문서에 ○○로 이해했습니다. 맞나요?」 not 「사업을 한 줄로 적어 주세요」 |
| **No full re-entry (FAIL)** | Empty full-form primacy after upload = **hard product FAIL** (S17 P0-1 Document First) |
| **Gap-only after draft** | User input is uncertainty / contradiction / missing only |

**FAIL if:** After upload, user is forced to re-enter full business fields, or Document Flow feels like “start the form over.”

### Flow B — New User (canonical sequence)

```text
minimal seed Q
  → Answer
  → Processing (staged)
  → Updated Understanding
  → AI chooses next Q from Question Engine priority
  → … (same Answer → Understanding → Conclusion → Next Gap)
  → Stage Transition Engine (enough) → Review → next action
```

**Hard rules (New User):**

| Rule | Meaning |
|------|---------|
| **AI chooses next Q** | Priority from Understanding gaps — not a static form sequence |
| **Not Document Flow with blank PDF** | No fake “document read” confidence |
| **Admit unknowns** | Seed path is honest “AI가 모릅니다” (S16 P0-5), then gap-driven only |
| **Minimize cognitive load** | One question at a time; gradual build |

---

## 3. Document Intelligence

After document intake, the product must **show** — not hide — what the document contributed.

| Surface | Requirement |
|---------|-------------|
| **What the doc said** | Visible extracted claims mapped into Understanding fields (with provenance DOCUMENT) |
| **What is missing** | Explicit Unknown / Critical Unknown list for business judgment |
| **Contradiction confirm** | If user later conflicts with doc (or doc internal conflict), dedicated confirm — never silent overwrite (§6) |

### Weak PDF honesty + gap-only Q

When PDF extract is weak / partial / low confidence:

| Do | Do not |
|----|--------|
| Honest Trust / confidence (S17 Trust Block baseline) | Fake high “document read” confidence |
| Partial draft + confirm | Empty full-form primacy |
| **Gap-only Q** for Unknown / Contradiction | Full re-entry questionnaire |
| Confirm-style on thin Known | Pretend all stages are filled |

Weak PDF is still **Document Flow**, not New User Flow with a blank file.

---

## 4. Information Provenance

Every Understanding claim carries a **Source**. Display honesty is mandatory.

| Source | Meaning | UI rule |
|--------|---------|---------|
| **DOCUMENT** | Extracted / attributed to uploaded plan | May show as document-backed fact pending confirm |
| **USER_ANSWER** | Explicitly stated or confirmed by user | May show as user fact when Confirmed |
| **AI_INFERENCE** | Model inferred / filled gap | **Never display as user fact**; label as AI judgment / inference |
| **UNKNOWN** | Not established | Shown as missing / Needs confirmation |

### Confirmation state (per claim)

| State | Meaning |
|-------|---------|
| **Confirmed** | User affirmed (or document confirm-style accepted) |
| **Needs confirmation** | Present but not yet user-validated |

**FAIL if:** AI_INFERENCE is presented as something the user said or as settled business truth without confirmation.

---

## 5. Understanding Confidence

Per field / claim confidence ladder (product language):

```text
Unknown → Inferred → User Confirmed → Sufficient
```

| Level | Meaning | Question behavior |
|-------|---------|-------------------|
| **Unknown** | No usable claim | Eligible for Question Engine (Critical Unknown first) |
| **Inferred** | AI_INFERENCE only | Needs confirmation; do not treat as Sufficient |
| **User Confirmed** | USER_ANSWER or confirm-style accept | Strong for stage progress |
| **Sufficient** | Confirmed + AI judged adequate for business judgment | **Skip re-asking**; do not quiz again |

**Skip re-ask when Sufficient** — locked. Re-ask only if Contradiction appears or user edits / challenges.

---

## 6. Contradiction Handling

**Dedicated Acceptance.** Contradictions are first-class product events.

| Rule | Meaning |
|------|---------|
| **Never silent overwrite** | New answer conflicting with DOCUMENT / prior USER_ANSWER must not quietly replace |
| **Confirm which is current truth** | One focused confirm / clarify Q: which version stands |
| **Priority** | Contradiction sits at **top** of Question Engine priority (§9) |
| **Stage impact** | Active Contradiction blocks Stage Transition (Contradiction = 0 required) |

**FAIL if:** Doc fact or prior confirmed answer disappears without user acknowledgment.

---

## 7. Memory Architecture

### Turn pipeline (locked)

```text
Q
  → Answer
  → Conversation Memory
  → Understanding (merge + provenance + confidence)
  → Presenter
  → UI (Summary / Detail / Conclusion / Next Gap / next Q)
```

### Bag sync completion criteria (from S14/S15 pain)

Phase 1-B must close ConversationMemory / Understanding sync failures that previously blocked trust:

| Criterion | PASS when |
|-----------|-----------|
| **No overwrite** | Prior answers / confirmed keys are not clobbered by later turns or stage moves |
| **Key sync** | Answer that establishes a field (e.g. `problem`) appears in Memory bag **and** Understanding in the same turn |
| **Stale prevent** | UI does not show obsolete Understanding after a successful merge |
| **Reload persistence** | Refresh / re-entry restores understanding, stage, conversation, confirmed/unknown (§17) |
| **Next-turn uses prior answers** | Question Engine and merge read prior Memory — not a blank slate each turn |
| **Survives stage move** | Advancing Understanding → Validation (or stage ✔) does not drop Memory keys |

**Baseline cite (do not rewrite contracts):** S14 Confirmed Issue — ConversationMemory bag sync (`problem`); carried in S15 backlog. Phase 1-B Scope requires **completion criteria** above as Acceptance — experience hardening, not a new memory product.

---

## 8. AI Processing Experience

**Staged thinking after answer** — not spinner-only.

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
| Staged labels tied to **real** work where possible (S17 Thinking baseline) | Spinner-only with no stage meaning |
| Visible duration of reflect before next Q | Silent jump to next quiz item |
| Same Processing chrome on Document and New User | Batch-all-inputs-then-analyze |
| Honest “working” only when work runs | **Fake progress / fake AI work presented as fact** |

**Forbidden:** Collect many answers first, then one late analysis. Understanding must reflect **immediately** after each answer. **No fake progress bars or fabricated “AI is analyzing…” theater** that implies completed work that did not run. Real pipeline or visible `[Sample]` (product constitution).

---

## 9. Question Engine

**One question at a time.** Ask only the **most important unknown for business judgment**.

### Priority (locked order)

1. **Contradiction** — resolve current truth first  
2. **Critical Unknown** — blocks business judgment / stage sufficiency  
3. **Business-critical Detail** — sharpens understanding without blocking  
4. **Optional** — soft confirm / nice-to-have; never starve higher priorities  

### Question quality (Known / New / Unknown / Contradiction)

| Class | Meaning | Question behavior |
|-------|---------|-------------------|
| **Known / Sufficient** | In doc or confirmed + adequate | Do **not** re-ask open; skip |
| **New** | Just learned this turn | Merge; do not re-quiz |
| **Unknown** | Missing for current stage / judgment | One Unknown-driven Q (highest priority) |
| **Contradiction** | Doc vs user, or answer vs prior | Resolve with one focused confirm / clarify |

### Confirm vs open

- Facts exist (esp. Document entry) → **confirm-style**  
- Unknown with no evidence → **open** gap Q  

### Good vs bad (examples)

| Good | Bad |
|------|-----|
| 「문서에 고객을 SMB로 이해했습니다. 맞나요?」 | 「사업을 한 줄로 / 고객 / 문제 / 솔루션을 모두 적어 주세요」 |
| One Critical Unknown for current stage | Multi-question wall / fixed questionnaire dump |
| Re-ask after nonsense (not ✔) | Polite “확인했습니다” then stage PASS |

---

## 10. Answer quality judgment

Do **NOT** always mark complete after any reply.

| Judgment | Behavior |
|----------|----------|
| **Sufficient** | Merge; update confidence toward User Confirmed / Sufficient; may clear Critical Unknown |
| **Ambiguous** | Clarify Q; do not ✔-pass stage |
| **Nonsense / low-signal** | May save for audit honesty; **must NOT** ✔-pass; re-judge → re-ask; stage stays ● |
| **Conflict** | Enter Contradiction Handling (§6); never silent overwrite |
| **「I don't know」 / 모름** | Record as Unknown / Needs confirmation; do not invent USER_ANSWER; ask next Critical Unknown or softer path — never fake sufficiency |

**No PASS by length** — no quiz-tick, no silent ✔.

---

## 11. User Follow-up

AI states a **Conclusion** (judgment now). User may reverse-question (e.g. **「왜?」**).

```text
AI Conclusion
  → User: 「왜?」 / challenge / edit
  → Explain why (Evidence ≤3 or Detail evidence + provenance)
  → return to validation loop unbroken
       (confirm / contradict resolve / next Gap Q)
```

| Rule | Meaning |
|------|---------|
| Conclusion is visible | Not buried only in chat praise |
| 「왜?」 returns evidence | Then returns to loop — not a dead-end essay |
| Evidence capped | Prefer ≤3 evidence points (Decision Fatigue; §16) |
| Loop unbroken | Follow-up never exits Understanding Engine into a dead end |

---

## 12. Summary / Detail (product-wide)

**Product-wide pattern** — not a one-off Document widget.

| Layer | Role |
|-------|------|
| **Summary** | Always visible short “AI가 이해한 내용” |
| **[더보기] → Detail** | Expand on demand — **not** a second primary CTA |
| **Detail may include** | Facts · Provenance (Source) · AI judgment / inference (labeled) · Evidence · Uncertainty · Follow-ups / open Gaps |
| **AI Conclusion** | What AI believes is true *now* |
| **Gap** | What is still missing |
| **One primary CTA** | Next Q or next stage / Review Hero only |

**One composition job:** Summary for scan; Detail on demand; never force Detail as the only path. Same pattern on loop turns and Review.

---

## 13. Stage Model

Two **modes** — do not jump early to market validation while the business itself is still unexplained.

### Understanding mode (사업 이해)

| Focus | Examples |
|-------|----------|
| 사업 | What we do |
| 고객 | Who pays / uses |
| 문제 | Pain / job |
| 해결 | How we solve |
| 수익 | How money enters |

### Validation mode (사업성 검토)

| Focus | Examples |
|-------|----------|
| 시장 | Size / channel context |
| 경쟁 | Alternatives / differentiation |
| 검증가능성 | What can be tested |
| 위험 | Fatal assumptions |
| 종합 | Judgment / next action |

**Rule:** Complete (or Sufficient) Understanding-mode fields before natural transition into Validation-mode questioning and Review. **No early jump** to market/competitor while business / customer / problem remain Unknown.

### Fixed stage spine ①–⑩ (skip known)

Canonical order. Stages are **fixed**; AI **skips already-Known / Sufficient** and lands on highest-priority Unknown / Contradiction.

| # | Stage | Mode | AI가 알고 있는 것 | 부족한 것 | 예시 다음 질문 | 완료 조건 |
|---|-------|------|-------------------|-----------|----------------|-----------|
| ① | **business** | Understanding | 무엇을 하는지 | 모호한 카테고리/범위 | 확인형 또는 「이 사업은 한 문장으로?」 | Confirmed + non-empty + Sufficient |
| ② | **customer** | Understanding | 누구를 위한지 | 페르소나/지불자 | 「누가 돈을 내고 쓰나요?」 | Confirmed + Sufficient |
| ③ | **problem** | Understanding | 고통/직무 | 깊이·빈도 | 「가장 아픈 점은?」 | Confirmed + Sufficient |
| ④ | **solution** | Understanding | 제안 방향(있다면) | 차별 가설 | 「그 문제를 어떻게 풀어 주나요?」 | Confirmed + Sufficient |
| ⑤ | **revenue** | Understanding | 수익 힌트 | 누가·어떻게 | 「돈은 어떻게 들어옵니까?」 | Confirmed + Sufficient |
| ⑥ | **market** | Validation | 시장 맥락 | 규모·진입 근거 | 「시장/채널은?」 | Confirmed + 근거 ≥1 |
| ⑦ | **competitor** | Validation | 대체재 인식 | 직접 경쟁·차별 | 「비슷한 선택지는?」 | Confirmed + 인식 |
| ⑧ | **risk** | Validation | 리스크 후보 | 치명 우선순위 | 「가장 위험한 가정은?」 | Confirmed + top risk 1 |
| ⑨ | **judgment** | Validation | 누적 Understanding | GO/HOLD 합의 | Final Review 「✓ 맞습니다」 | 전체 확인 |
| ⑩ | **next action** | Validation | 합의된 판단 | 실행 한 줄 | Review Hero CTA | next action 1개 |

**Skip known:** Document entry may enter mid-spine (e.g. ①–③ Sufficient from PDF → start ● on first Unknown). Do not force walkthrough of ✔ stages.

**Honesty:** Today’s S17 spine prioritizes business / customer / problem (± market/competitor). Full ①–⑩ as first-class UI+status are **Scope targets** for Phase 1-B — not claimed already complete. Order above places Understanding revenue **before** Validation market (aligned with Stage Model).

---

## 14. Stage Transition Engine

### Marks

| Mark | Meaning |
|------|---------|
| **✔ 확인됨** | User confirmed **and** AI judged Sufficient; stage may advance |
| **● 현재 확인 중** | Active — Processing / Question / awaiting confirm / re-ask after insufficient answer |
| **○ 아직 확인 전** | Not yet reached or insufficient confidence |

### Transition gates (NOT answer-count thresholds)

Advance / enter Review when **all** of:

| Gate | Requirement |
|------|-------------|
| **Required fields** | Understanding-mode required set present for current transition target |
| **Confidence** | Required claims at **Sufficient** (or User Confirmed + AI sufficiency) |
| **Contradiction = 0** | No unresolved Contradiction |
| **Critical Unknown = 0** | No open Critical Unknown for the transition |

**Forbidden:** Advance by answer count, polite ack, or length alone. On advance: **announce next stage** (user always knows what to do next — no dead end). Nonsense / ambiguous keeps ● and re-asks.

---

## 15. Review Experience

Final surface when Stage Transition Engine says **enough**:

```text
Judgment (AI conclusion first)
  → 3 reasons (evidence / why)
  → 1 critical problem
  → 1 Hero CTA
  → Detail (secondary — facts, provenance, uncertainty, follow-ups)
```

| Rule | Meaning |
|------|---------|
| **Judgment first** | Not a dashboard of widgets |
| **3 reasons** | Cap cognitive load; more under Detail |
| **1 critical problem** | Single sharp risk / gap — not a wall of issues |
| **1 Hero CTA** | Single primary next action |
| **Detail secondary** | Evidence / provenance behind [더보기] — not competing CTAs |

Exit Review = clear next action — Workspace user always knows **what to do next**.

---

## 16. Decision Fatigue KPI

| KPI | Rule |
|-----|------|
| **Hero CTA always = 1** | Every primary surface (loop turn, stage announce, Review) has exactly one primary CTA |
| **「다음에 뭘 해야 하지?」 never** | FAIL if user cannot name the next action after any screen |
| **No multi-CTA hero row** | Decision Fatigue FAIL |
| **Evidence / Detail secondary** | Never compete with Hero |

Preserves S16 P0-4 one Hero spirit end-to-end through Understanding → Review.

---

## 17. Resume / Refresh / Persistence

Survive refresh and re-entry:

| Must survive | Meaning |
|--------------|---------|
| **Understanding** | Field claims + confidence levels |
| **Stage** | Current mode / ✔●○ marks |
| **Conversation** | Q/A turns needed for continuity |
| **Confirmed / Unknown** | Confirmation state + Critical Unknown set |
| **Provenance** | Source labels intact after reload |
| **Memory bag** | Meets §7 bag sync criteria after reload |

**FAIL if:** Refresh resets to empty form, loses Sufficient facts, or re-asks Known doc content as open questions.

---

## 18. Demo / Authenticated

| | Demo | Authenticated |
|--|------|-----------------|
| **Understanding Contract** | **Same** | **Same** |
| **Question / Stage / Review** | **Same** | **Same** |
| **Difference** | Persistence / session lifetime / auth boundary only | Durable persistence / identity |

**Do not** fork product logic into “demo Understanding” vs “auth Understanding.” Same engine; storage/auth only differs.

---

## 19. Product UX surfaces

One continuous experience — not siloed pages:

```text
Landing
  → Entry (doc vs no-doc)
  → Workspace (Understanding loop + Processing + Spine)
  → Review (judgment → reasons → critical problem → Hero CTA)
```

| Surface | Job |
|---------|-----|
| **Landing** | Entry only — **no** brand Landing redesign in this sprint (Phase 1-A closed) |
| **Entry** | Choose / detect Document vs New User; then Shared Engine |
| **Workspace** | Live Understanding, one Q, staged Processing, Summary/Detail |
| **Review** | Decision Fatigue–compliant judgment surface |

---

## 20. QA Matrix

**One final QA batch** after Implementation — not piecemeal CPO loops. Expands prior Scenarios A–F into a full matrix.

### Document

| Case | PASS when |
|------|-----------|
| **Complete PDF** | Document Intelligence shows said / missing; Confirm Q; never re-ask Known; → Review |
| **Incomplete / weak PDF** | Honest confidence; gap-only Q; still Document Flow |
| **Filename-only / near-empty extract** | No fake document-read confidence; Unknowns explicit; gap-driven |
| **Conflict (doc vs user)** | Contradiction confirm; no silent overwrite |

### Conversation

| Case | PASS when |
|------|-----------|
| **OK / Sufficient answer** | Merge + confidence up; next Q from priority |
| **Nonsense** | No ✔-pass; re-ask; stage stays ● |
| **Ambiguous** | Clarify; not Sufficient |
| **Follow-up 「왜?」** | Evidence → loop unbroken |
| **Edit / reverse prior** | Contradiction or confirm path; Memory consistent |

### State

| Case | PASS when |
|------|-----------|
| **Refresh** | Understanding / stage / conversation / confirmed survive (§17) |
| **Resume** | Re-entry continues; no full re-entry FAIL |
| **Transition** | Gates = Required + Confidence + Contradiction=0 + Critical Unknown=0 — not answer count |
| **Memory** | Bag sync criteria (§7) all PASS |

### Product

| Case | PASS when |
|------|-----------|
| **Demo** | Same Understanding Contract as Auth |
| **Auth** | Persistence durable; contract identical |
| **Mobile** | One Hero; Summary/Detail usable; no multi-CTA trap |
| **Desktop** | Same engine chrome; Decision Fatigue KPI |

### Legacy scenario map (A–F → matrix)

| Legacy | Maps to |
|--------|---------|
| A Strong PDF | Document · Complete |
| B Weak PDF | Document · Incomplete |
| C New User | Conversation · OK + State · Transition |
| D Nonsense | Conversation · Nonsense |
| E 「왜?」 | Conversation · Follow-up |
| F Stage skip + advance | State · Transition + Review Decision Fatigue |

### Cross-cutting Acceptance checklist

- [ ] Two entries → one Shared Understanding Engine (§2)  
- [ ] Document Intelligence: said / missing / contradiction (§3)  
- [ ] Provenance + never show AI_INFERENCE as user fact (§4)  
- [ ] Confidence ladder; skip re-ask when Sufficient (§5)  
- [ ] Contradiction never silent overwrite (§6)  
- [ ] Memory pipeline + bag sync criteria (§7)  
- [ ] Processing staged; no fake AI progress as fact (§8)  
- [ ] Question Engine priority + one Q (§9)  
- [ ] Answer quality judgment not always complete (§10)  
- [ ] Follow-up returns to loop (§11)  
- [ ] Summary / Detail product-wide (§12)  
- [ ] Stage Model Understanding vs Validation (§13)  
- [ ] Stage Transition Engine gates (§14)  
- [ ] Review: judgment → 3 reasons → 1 critical → 1 Hero (§15)  
- [ ] Decision Fatigue KPI (§16)  
- [ ] Resume / Refresh / Persistence (§17)  
- [ ] Demo / Auth same contract (§18)  
- [ ] UX surfaces one experience (§19)  
- [ ] QA Matrix one final batch (§20)  

---

## 21. Deliverables (13)

Post–Scope Freeze Implementation delivers **all** of the following. This expansion doc locks language only — **Product Spec authorship starts after Freeze**.

| # | Deliverable | Maps from prior Tracks A–E |
|---|-------------|----------------------------|
| 1 | **Product Spec** | Track E (after Freeze) |
| 2 | **UX Flow** | Tracks A–B journey chrome |
| 3 | **Understanding Contract** | Track C spine |
| 4 | **Document Intelligence Contract** | Track A Document |
| 5 | **Memory Contract** | Track C + S14/S15 bag sync criteria |
| 6 | **Question Engine Contract** | Track C Q rules |
| 7 | **Stage Transition Contract** | Track C stages + gates |
| 8 | **UI implementation** | Tracks A–D experience |
| 9 | **Internal QA** | Track D + §20 matrix (one batch) |
| 10 | **Regression** | S16/S17 KEEP + Phase 1-B AC |
| 11 | **Production validation** | Deploy-time honesty checks |
| 12 | **CEO Walkthrough Guide** | After CPO opens Walkthrough |
| 13 | **CPO Review Package** | CTO Report + evidence + AC |

**Out of this expansion doc:** writing full Specs, implementation, deploy, CEO Walkthrough execution.

---

## 22. Explicit OUT

Do **not** include in Phase 1-B:

| OUT | Why |
|-----|-----|
| **New AI Provider** | No new LLM / PDF / auth providers |
| **New analysis engine** | No `businessPlan.generate` / orchestration spine rewrite |
| **New score model** | No score-led primary UX |
| **Marketplace** | Out of ALABOM Phase 1-B |
| **Dashboard / KPI widget walls** | Journey, not dashboards |
| **Auth redesign / structure changes** | High-risk; not this sprint — Demo/Auth = persistence only |
| **G2 / Generation-2 contract breaks** | No reopen |
| **S7 / S8 / S14 / S16 / S17 contract changes** | Trust, confirm-before-ask, Document First, Thinking, one Hero, review gate — **KEEP**; experience language only |
| Mid-sprint Phase 1-C / 1-D renumber | Structure under Phase 1-B only |
| Multi-CTA per stage / Review | Decision Fatigue FAIL |
| Long forms / empty full-form after upload | Document Flow FAIL |
| Batch-all-inputs-then-analyze | Contract FAIL |
| Fake progress presented as real AI work | Processing FAIL |
| LaunchLens brand restore | ALABOM display brand; `launchlens.*` storage keys **KEEP** |
| CartPilot / Platform SDK | Forbidden |
| Landing redesign beyond closed Phase 1-A / 1-A.1 | Closed |
| Phase 1-B **implementation** until CPO Scope Freeze | **HOLD** |

---

## 23. Gate

```text
Scope Expansion (this doc)
  → CPO Scope Freeze          ← after expansion accepted
  → Implementation            ← HOLD until Freeze
  → Internal QA (one batch)
  → CTO Report
  → CPO
  → CEO Walkthrough           (HOLD until CPO opens)
```

| Item | Status |
|------|--------|
| Phase 1-A / 1-A.1 | **CLOSED** |
| Phase 1-B `ea11e70` Freeze Candidate | **Superseded** — CPO Freeze deferred |
| Phase 1-B Scope | **LONG SPRINT — Scope Expansion Required** (this doc) |
| Phase 1-B Scope Freeze Candidate claim | **Forbidden** until CPO accepts expansion |
| Phase 1-B Scope Freeze | ⛔ awaiting CPO |
| Phase 1-B Implementation | ⛔ **HOLD** · **NOT started** |
| Product Spec (§21 #1) | ⛔ after Freeze only |
| CEO Walkthrough | **HOLD** |

### CPO decision needed

Reply with one of:

- **Freeze** → lock §§1–25 as Freeze input; only then allow Impl kickoff + Product Spec  
- **수정** → list journey / contract / AC deltas (implementation still HOLD)  
- **HOLD** → keep Implementation HOLD; no Freeze  
- **Expand further** → additional Scope language (still not Freeze Candidate)

---

## 24. Baseline vs Gap (honest)

### Current baseline (do not rewrite contracts)

| Area | What already exists | Cite |
|------|---------------------|------|
| Document First / no empty-form primacy | S17 P0-1 PASS | `S17_SHARED_UNDERSTANDING_LOOP.md` |
| Loop reflect + Thinking stages | Answer → Thinking → SU highlight | S17 P0-2/P0-3 |
| Missing-field priority Q | customer / problem / business (+ diagnosis fallback) | S17 P0-5 |
| Shared Understanding draft | business / customer / problem ± market / competitor | S17 |
| Confirm before first ask | S16 P0-2 | loop panel |
| Trust honesty on weak PDF | Trust Block | S17 |
| Empty / no-doc start | Seed “AI가 모릅니다” | S16 P0-5 |
| Final Review before Analysis | P1-3 | S17 |
| One Hero post-analysis | S16 P0-4 | S16 |
| Memory bag sync pain | `problem` key sync Accepted Risk | S14 → S15 backlog |

### What Phase 1-B still needs (honest gaps)

| Gap | Why it matters |
|-----|----------------|
| Shared Understanding Engine as single product contract across both entries | §2 |
| Document Intelligence (said / missing / contradiction confirm) | §3 |
| Provenance + Confidence ladder + Contradiction Acceptance | §4–§6 |
| Memory Architecture + bag sync completion criteria | §7 |
| Honest staged Processing (no fake AI work) | §8 |
| Question Engine priority + answer quality judgment | §9–§10 |
| Follow-up unbroken loop + Summary/Detail depth | §11–§12 |
| Understanding vs Validation Stage Model + Transition gates | §13–§14 |
| Review (judgment → 3 reasons → 1 critical → 1 Hero) + Decision Fatigue KPI | §15–§16 |
| Resume / Demo-Auth sameness / UX surfaces / QA Matrix / 13 deliverables | §17–§21 |

**Bottom line:** S17 delivers the **philosophy**. Phase 1-B is a **LONG Sprint — Scope Expansion Required** to define the full AI Business Understanding Engine & Experience — **not** Freeze-ready yet, **not** a small UI sprint, **not** a new provider/engine. **No S7–S17 contract rewrites** in this document.

---

## 25. Explicit non-claims

- **Zero product / UI / engine code changes** in this Scope Expansion session  
- **Phase 1-B Implementation NOT started** (HOLD)  
- **No S7 / S8 / S14 / S16 / S17 contract changes** in this doc  
- This doc is **NOT** Scope Freeze Candidate and does **not** claim Freeze-ready  
- This doc does **not** authorize Impl, deploy, Product Spec authorship as Freeze substitute, or CEO Walkthrough  

### Intentionally deferred (until after CPO Freeze)

- Full Product Spec / per-contract formal schemas  
- UI implementation & production wiring  
- Internal QA execution (matrix runs post-Impl as one batch)  
- CEO Walkthrough Guide fill-in with live evidence  
- Any Phase 1-C/1-D split (forbidden mid-sprint; revisit only if CPO explicitly renumbers after Freeze)

---

*Record only — Next Autonomous Target: CPO Freeze / 수정 / HOLD / Expand further on this Scope Expansion; Implementation remains HOLD until Freeze. Status remains 🟡 LONG SPRINT — Scope Expansion Required (not Freeze Candidate).*
