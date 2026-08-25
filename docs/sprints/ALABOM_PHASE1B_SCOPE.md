# ALABOM Phase 1-B — AI Business Validation Experience

```text
🟡 LONG SPRINT — Scope Expansion (CTO Work Order)
Status: NOT FREEZE — awaiting single CPO Scope Review after EXECUTION_PLAN + this SCOPE
Implementation: HOLD
Baseline: d6d0e91
Sprint identity: ALABOM Phase 1-B — AI Business Validation Experience
```

**Date:** 2026-08-25  
**From:** CTO → CPO  
**Document type:** **CTO Work Order** (Scope Expansion — language only)  
**Predecessor gates:** Phase 1-A / 1-A.1 **CLOSED** · Phase 1-B **IMPLEMENTATION HOLD** · **CEO HOLD**  
**Baseline (preserved):** `d6d0e91` — do **not** delete history; this revision **builds on** that Scope. Prior Freeze-candidate language (`ea11e70` lineage) remains historical context only.  
**Product track:** ALABOM Workspace first-experience — **core product experience** (AI Business Validation), not a small UX polish sprint. Does **not** reopen brand Landing work.  
**Constraint:** Docs-only. **No code, no build/test, no deploy, no Phase 1-B impl, no unauthorized S7–S17 contract breaks** in this deliverable.  
**Companion:** [`ALABOM_PHASE1B_EXECUTION_PLAN.md`](./ALABOM_PHASE1B_EXECUTION_PLAN.md)

**Sources (prefer docs language):**  
[`S17_SHARED_UNDERSTANDING_LOOP.md`](./S17_SHARED_UNDERSTANDING_LOOP.md) · [`S16_UX_RECOVERY.md`](./S16_UX_RECOVERY.md) · [`ALABOM_PHASE1A_REPORT.md`](./ALABOM_PHASE1A_REPORT.md) · [`ALABOM_PHASE1A_CPO_REVIEW.md`](./ALABOM_PHASE1A_CPO_REVIEW.md) · [`ALABOM_PHASE0_SCOPE_FREEZE.md`](./ALABOM_PHASE0_SCOPE_FREEZE.md) · S14/S15 ConversationMemory bag-sync pain · `docs/PRODUCT_VISION_V3.md` · baseline SHA `d6d0e91`

---

## Absolute ban — no mid-sprint Phase split (locked)

```text
Phase 1-B = AI Business Validation Experience (ONE LONG SPRINT)
 ├─ Product Contract & Philosophy
 ├─ Journey A Document First + Journey B Start From Idea
 ├─ Unified Understanding Engine
 ├─ Business Understanding Domain + Provenance + Confidence
 ├─ Contradiction / Answer Quality / Question Engines
 ├─ AI Processing + Understanding Update UX
 ├─ Summary/Detail · Understanding Spine · Correction · Follow-up
 ├─ Stage Architecture A–D + Transition + Validation handoff
 ├─ Analysis Architecture (Evidence First; score supporting)
 ├─ Memory · Persistence · Demo/Auth
 ├─ Document Upload + Quality · New User · Landing→Workspace
 ├─ Workspace UX · Navigation · Loading/Error · New Project · Review Start
 ├─ Mobile · A11y · Performance · Token/Cost Control
 ├─ Regression protect S7/S8/S14/S16/S17
 ├─ QA Matrix · Evidence Package · CEO Walkthrough
 └─ CPO Gate package
```

**Do not** invent Phase 1-B.1 / 1-B.2 / 1-C / 1-D mid-sprint. Blockers stay in **Phase 1-B backlog**. Code merge ≠ done.

---

## Table of contents

| § | Title |
|---|--------|
| 0 | Absolute product goal |
| 1 | Product philosophy |
| 2 | Journey A — Document First |
| 3 | Journey B — Start From Idea |
| 4 | Unified Understanding Engine |
| 5 | Business Understanding Domain (01–20) |
| 6 | Source Provenance |
| 7 | Confidence |
| 8 | Contradiction Engine |
| 9 | Answer Quality Engine |
| 10 | Question Priority Engine |
| 11 | Question generation rules |
| 12 | AI Processing Experience |
| 13 | Understanding Update (Before→After) |
| 14 | Summary / Detail |
| 15 | Understanding Spine |
| 16 | User Correction |
| 17 | User Follow-up Question |
| 18 | Stage Architecture A–D |
| 19 | Stage Transition |
| 20 | Validation Engine handoff |
| 21 | Analysis Architecture |
| 22 | Evidence First |
| 23 | Score is supporting |
| 24 | Hero CTA = 1 |
| 25 | Decision Fatigue |
| 26 | Memory (S14/S15 bag sync) |
| 27 | Persistence matrix |
| 28 | Demo / Auth Contract |
| 29 | Document Upload pipeline |
| 30 | Document Quality test set |
| 31 | New User Experience |
| 32 | Landing → Workspace branching |
| 33 | Workspace UX priority order |
| 34 | Navigation |
| 35 | Loading / Error / Empty / Retry |
| 36 | New Project |
| 37 | Review Start success / cannot / error |
| 38 | Mobile order integrity |
| 39 | Accessibility minimum |
| 40 | Performance |
| 41 | Token / AI Cost Control (CTO development) |
| 42 | Regression protect S7/S8/S14/S16/S17 |
| 43 | QA Matrix A1–F4 |
| 44 | Evidence Package 01–16 |
| 45 | CEO Walkthrough A + B |
| 46 | Sprint completion checklist |
| 47 | Absolute bans on micro-sprints |
| 48 | CTO process |
| 49 | Recommended internal work order |
| 50 | Final CPO Gate package |
| — | Explicit OUT · Gate statement · Baseline vs Gap · Non-claims |

---

## Gate statement

```text
Phase 1-A / 1-A.1 CLOSED
        ↓
Phase 1-B baseline Scope d6d0e91 (preserved)
        ↓
Phase 1-B LONG SPRINT — Scope Expansion (CTO Work Order)  ← YOU ARE HERE
        + EXECUTION_PLAN
        ↓
ONE CPO Scope Review (PASS / FIX / HOLD)  ← only mid-gate
        ↓
Implementation (blocked until Scope PASS)  ← still HOLD
        ↓
Internal QA → Production QA → Evidence → CTO Final Report
        → CPO Review → CEO Walkthrough
```

**Explicit:** Phase 1-B **implementation has NOT started.** This document + EXECUTION_PLAN are the **CTO work instruction** for one **AI Business Validation Experience**. **NOT Freeze.** Implementation remains **HOLD** until CPO Scope **PASS**.

---

## §0 Absolute product goal

> 사용자가 가진 정보(문서 또는 아이디어)를 입력하면 → ALABOM이 사업을 분석·이해하고 → 결과를 보여주며 → **AI 파트너 루프**(질문 → 답 → 이해 갱신 → 판단 → 다음 행동)로 사업성 검증까지 이어지는 **하나의 경험**을 완성한다.

| Input | Analysis | Result | Partner loop |
|-------|----------|--------|--------------|
| PDF / plan **or** minimal idea seed | Unified Understanding Engine | Summary · Spine · Judgment · Gaps | Ask → Answer → Process → Update → Transition → Validation |

**Exit = alpha-openable Business Validation Experience** — not green build alone, not “nice chat.”

---

## §1 Product philosophy

The **full loop is one experience**:

```text
Understand → Ask only what matters → Update visibly → Resolve contradiction
  → Transition when ready → Evidence-first Validation → One Hero next action
```

| Is | Is not |
|----|--------|
| Core product experience: AI Business Validation | Small UX polish / widget sprint |
| Document + Idea → **one** Unified Understanding Engine | Two products with divergent contracts |
| AI leads; user confirms / corrects | User fills long forms first |
| Honest unknown / inference labels | Silent mock presented as fact |
| Journey improvement on S16/S17 baseline | New provider / engine / score model |

---

## §2 Journey A — Document First

Canonical sequence:

```text
PDF upload
  → Parse / extract (honest quality)
  → Draft Understanding (provenance DOCUMENT)
  → Document Intelligence: what doc said / missing / contradiction
  → Summary (AI가 이해한 내용) → [더보기] Detail
  → Judgment now + Gaps
  → Confirm-style Q when Known in doc; open Q only for Unknown
  → Answer → Processing (§12) → Updated Understanding (§13)
  → … loop …
  → Stage Transition (§19) → Validation handoff (§20)
```

### Absolute bans (Document)

| Ban | Meaning |
|-----|---------|
| **No “just type it manually” after weak PDF** | Weak extract → honest Trust + partial draft + **gap-only** Q. Never dump empty full-form or tell user to re-type the plan. |
| **Never re-ask document facts as open questions** | Confirm-style only when doc has claims |
| **No empty full-form primacy after upload** | Hard product **FAIL** (S17 P0-1 Document First) |
| **Weak PDF ≠ Journey B** | Still Document Flow with honesty — not fake “document read” confidence |

**FAIL if:** After upload, user is forced to re-enter full business fields, or product says “문서가 약하니 직접 입력하세요” as the primary path.

---

## §3 Journey B — Start From Idea

Canonical sequence:

```text
Minimal seed Q (이름 / 아이디어 수준 — §31)
  → Answer → Processing → Updated Understanding
  → AI chooses next Q (Question Priority §10)
  → … same Answer → Understanding → Conclusion → Next Gap …
  → Stage Transition → Validation handoff
```

### Absolute bans (Idea)

| Ban | Meaning |
|-----|---------|
| **Not Document Flow with blank PDF** | No fake document-read confidence |
| **Not a fixed 20-question quiz** | Domain fields exist (§5); AI skips Known; asks one gap at a time |
| **Admit unknowns** | Seed path honest “AI가 모릅니다” (S16 P0-5), then gap-driven |
| **One question at a time** | Minimize cognitive load |

---

## §4 Unified Understanding Engine

Both journeys converge on the **same** contracts:

| Contract | Shared |
|----------|--------|
| Understanding fields + Domain 01–20 | Yes |
| Provenance · Confidence · Contradiction | Yes |
| Answer Quality · Question Priority · Generation | Yes |
| Processing · Spine · Summary/Detail | Yes |
| Stage A–D · Transition · Validation handoff | Yes |
| Memory · Persistence | Yes (storage lifetime may differ — §28) |

**One engine, two entries — not two products.**

---

## §5 Business Understanding Domain (01–20)

These are **understanding fields**, not a 20-question form. AI **skips Known / Confirmed / Sufficient** and asks only what Stage + Priority require.

| # | Field | Stage affinity | Notes |
|---|-------|----------------|-------|
| 01 | Business one-liner | A | What we do |
| 02 | Category / scope | A | Boundary honesty |
| 03 | Customer / persona | A | Who uses |
| 04 | Payer | A | Who pays (may = customer) |
| 05 | Problem / job-to-be-done | A | Pain |
| 06 | Problem frequency / severity | A | Depth |
| 07 | Solution | A | How we solve |
| 08 | Differentiation hypothesis | A | Why us |
| 09 | Revenue model | A | How money enters |
| 10 | Pricing hint | A | Optional until critical |
| 11 | Market / channel context | B | Validation |
| 12 | Market size / entry evidence | B | Evidence ≥1 when required |
| 13 | Alternatives / competitors | B | Recognition |
| 14 | Differentiation vs alternatives | B | |
| 15 | Top risks / fatal assumptions | C | Risk |
| 16 | Validation / testability | B–C | What can be tested |
| 17 | Execution constraints | C | Team / time / capital honesty |
| 18 | Evidence strength summary | B–D | Supporting, not hero |
| 19 | Current judgment (GO/HOLD spirit) | D | Decision |
| 20 | Next action (one line) | D | Hero CTA content |

**Rule:** Skip Known. Never walk 01–20 as a questionnaire dump.

---

## §6 Source Provenance

Every claim carries a **Source**. Display honesty is mandatory.

| Source | Meaning | UI rule |
|--------|---------|---------|
| **DOCUMENT** | Extracted / attributed to uploaded plan | Document-backed; confirm-style when needed |
| **USER_CONFIRMED** | User affirmed a claim | May show as user-backed fact |
| **USER_CORRECTED** | User replaced prior claim | New truth; prior retained for audit honesty |
| **AI_INFERENCE** | Model inferred / filled gap | **Never** as settled user fact; label inference |
| **EXTERNAL_EVIDENCE** | Outside evidence (when present) | Labeled; not invented as DOCUMENT |
| **UNKNOWN** | Not established | Missing / Needs confirmation |

**FAIL if:** `AI_INFERENCE` is shown as something the user said or as validated business truth without confirmation.

*(Baseline `d6d0e91` used DOCUMENT / USER_ANSWER / AI_INFERENCE / UNKNOWN — this expansion adds USER_CONFIRMED, USER_CORRECTED, EXTERNAL_EVIDENCE and maps USER_ANSWER → USER_CONFIRMED / USER_CORRECTED.)*

---

## §7 Confidence

Per field / claim ladder:

```text
UNKNOWN → INFERRED → PROPOSED → USER_CONFIRMED → VALIDATED
```

| Level | Meaning | Question / stage behavior |
|-------|---------|---------------------------|
| **UNKNOWN** | No usable claim | Eligible for Question Engine (Critical first) |
| **INFERRED** | AI_INFERENCE only | Needs confirmation; **≠ fact** |
| **PROPOSED** | Draft shown for confirm (doc or AI) | Confirm-style preferred |
| **USER_CONFIRMED** | User affirmed | Strong for progress |
| **VALIDATED** | Confirmed + adequate for current stage judgment | **Skip re-ask** unless Contradiction / user edit |

**Locked:** AI inference ≠ fact. Skip re-ask when VALIDATED (or Sufficient equivalent). Re-ask only on Contradiction or user challenge.

---

## §8 Contradiction Engine

First-class product events — dedicated Acceptance.

| Rule | Meaning |
|------|---------|
| **Never silent overwrite** | Conflict with DOCUMENT / USER_CONFIRMED / USER_CORRECTED must not quietly replace |
| **Confirm current truth** | One focused confirm / clarify Q |
| **Priority** | Top of Question Priority (§10) |
| **Stage impact** | Unresolved Contradiction **blocks** Stage Transition |
| **Provenance** | Resolution yields USER_CONFIRMED or USER_CORRECTED |

**FAIL if:** Doc fact or prior confirmed answer disappears without acknowledgment.

---

## §9 Answer Quality Engine

Do **NOT** always mark complete after any reply.

| Judgment | Behavior |
|----------|----------|
| **VALID** | Merge; raise confidence toward USER_CONFIRMED / VALIDATED when appropriate |
| **PARTIAL** | Merge what is usable; clarify remaining Critical Unknown |
| **AMBIGUOUS** | Clarify Q; do not ✔-pass stage |
| **IRRELEVANT** | Do not invent USER_CONFIRMED; re-ask or softer path |
| **CONTRADICTORY** | Enter Contradiction Engine (§8) |
| **UNKNOWN** | 「모름」 / empty signal → record UNKNOWN; never fake sufficiency |

**No PASS by length** — no quiz-tick, no silent ✔.

*(Maps baseline Sufficient / Ambiguous / Nonsense / Conflict / 모름 into this enum.)*

---

## §10 Question Priority Engine

**One question at a time.** Ask only the most important unknown for business judgment.

Locked order:

1. **Contradiction** — resolve current truth  
2. **Critical Unknown** — blocks stage sufficiency / business judgment  
3. **Business-critical Detail** — sharpens without blocking  
4. **Optional** — soft confirm; never starve higher priorities  

---

## §11 Question generation rules

Next Q is derived from the **full state vector** — never a static list:

| Input | Role |
|-------|------|
| **Known** | Skip open re-ask |
| **Confirmed** (USER_CONFIRMED / VALIDATED) | Skip; confirm-style only if Contradiction |
| **Inferred** (INFERRED / PROPOSED) | Prefer confirm-style |
| **Unknown** | Open gap Q by priority |
| **Contradiction** | Resolve first |
| **Stage** (A–D) | Only ask what current stage needs; no early market quiz while A incomplete |

| Good | Bad |
|------|-----|
| 「문서에 고객을 SMB로 이해했습니다. 맞나요?」 | 「사업/고객/문제/솔루션을 모두 적어 주세요」 |
| One Critical Unknown for current stage | 20-field questionnaire / multi-Q wall |
| Re-ask after IRRELEVANT / AMBIGUOUS | Polite “확인했습니다” then stage PASS |

---

## §12 AI Processing Experience

Staged thinking after answer — not spinner-only.

```text
Answer
  → Processing 1: Memory / 반영 중
  → Processing 2: Understanding update
  → Processing 3: Next Gap / next Q ready
  → Updated Understanding visible
  → next Q or stage advance announcement
```

| Allowed | Forbidden |
|---------|-----------|
| Staged labels tied to **real** work where possible (S17 Thinking) | Spinner-only with no meaning |
| Same chrome on Journey A and B | Batch-all-inputs-then-analyze |
| Honest working only when work runs | **Fake AI work presented as fact** |
| Visible `[Sample]` if not real pipeline | Silent mock as production truth |

---

## §13 Understanding Update Before → Answer → Processing → After

Every turn must make the delta **visible**:

```text
Before (what AI believed)
  → User Answer
  → Processing (§12)
  → After (what changed: fields + provenance + confidence)
  → UI: highlight / “이렇게 이해를 수정했습니다”
```

| Rule | Meaning |
|------|---------|
| Immediate reflect | No collecting many answers then one late analysis |
| Delta visible | User sees which fields moved |
| Loop unbroken | Always a next Q or stage announce — no dead end |

---

## §14 Summary / Detail

Product-wide pattern (not a one-off Document widget):

| Layer | Role |
|-------|------|
| **Summary** | Always-visible short “AI가 이해한 내용” |
| **[더보기] → Detail** | On demand — **not** a second primary CTA |
| **Detail may include** | Facts · Provenance · Labeled inference · Evidence · Uncertainty · Open Gaps |
| **One primary CTA** | Next Q or Hero only |

---

## §15 Understanding Spine

Visible spine of progress (✔ / ● / ○) aligned to Stage A–D fields — **user journey language**, not internal engine names.

| Mark | Meaning |
|------|---------|
| **✔** | USER_CONFIRMED / VALIDATED for that node |
| **●** | Current — Processing / Question / awaiting confirm |
| **○** | Not yet / insufficient |

**Skip known:** Document entry may land mid-spine. Do not force walkthrough of ✔ nodes.  
**Honesty:** S17 today covers business / customer / problem (± market/competitor). Full spine depth is a **Phase 1-B Scope target** on baseline — not claimed already complete.

Canonical Understanding → Validation node order (skip Known): business → customer → problem → solution → revenue → market → competitor → risk → judgment → next action (aligned with Domain 01–20 / Stages A–D).

---

## §16 User Correction

User may reject or edit AI understanding:

```text
AI draft / claim
  → User: 아닙니다 / 수정
  → Correction capture (USER_CORRECTED)
  → Contradiction path if conflicts with DOCUMENT or prior confirm
  → Processing → After Understanding
```

Never silent overwrite of prior DOCUMENT / USER_CONFIRMED without the Contradiction path when conflict exists.

---

## §17 User Follow-up Question

AI states a **Conclusion**. User may reverse-question (e.g. **「왜?」**).

```text
AI Conclusion
  → User: 「왜?」 / challenge
  → Explain (Evidence ≤3 or Detail) with provenance
  → return to validation loop unbroken
```

Follow-up never exits into a dead-end essay. Evidence capped for Decision Fatigue (§25).

---

## §18 Stage Architecture A / B / C / D

| Stage | Name | Focus | Gate spirit |
|-------|------|-------|-------------|
| **A** | Understanding | Business, customer, problem, solution, revenue | Sufficient A before early B |
| **B** | Validation | Market, competitive, testability | Evidence-aware |
| **C** | Risk | Fatal assumptions, execution constraints | Top risk clear |
| **D** | Decision | Judgment + **one** next action | Hero CTA = 1 |

**No early jump** to market/competitor while A Critical Unknowns remain.

---

## §19 Stage Transition

**Not answer-count thresholds.**

Advance when **all** of:

| Gate | Requirement |
|------|-------------|
| Required fields for target | Present |
| Confidence | Required claims USER_CONFIRMED / VALIDATED (or AI sufficiency + confirm policy) |
| Contradiction = 0 | Unresolved = 0 |
| Critical Unknown = 0 | For the transition |

On advance: **announce next stage** — user always knows what to do next. Nonsense / AMBIGUOUS keeps ● and re-asks.

---

## §20 Validation Engine handoff

When Transition says **enough** for Validation / Review:

| Copy / UX | Requirement |
|-----------|-------------|
| Handoff announcement | Clear: Understanding → Validation / Review |
| What carries | Understanding + provenance + confidence + Memory |
| What does not | Re-quiz Known; silent drop of bag keys |
| Tone | AI PM — judgment leading into Evidence First (§22) |

---

## §21 Analysis Architecture

Analysis surfaces (post-handoff), **not** a score hero:

| Lens | Role |
|------|------|
| Problem / Solution / Customer Fit | Core fit judgment |
| Market | Context + evidence |
| Revenue | Model honesty |
| Competitive | Alternatives |
| Execution Risk | Fatal assumptions |
| Evidence Strength | Supporting signal |

Scores (if any) are **supporting chrome** — never the primary composition (§23).

---

## §22 Evidence First

Canonical Review / Analysis read order:

```text
Judgement
  → Evidence (≤3 primary; more in Detail)
  → Reasoning
  → Action (exactly one Hero CTA)
```

**FAIL if:** Score wall or dashboard widgets lead the first viewport.

---

## §23 Score is supporting

| Rule | Meaning |
|------|---------|
| Score ≠ hero | Judgment + Evidence + Action lead |
| No new score model in Phase 1-B | OUT (§ Explicit OUT) |
| Existing signals | May display as secondary Detail |

---

## §24 Hero CTA = 1

Every primary surface (loop turn, stage announce, Review, Analysis exit) has **exactly one** primary CTA. Preserves S16 P0-4 one Hero spirit end-to-end.

---

## §25 Decision Fatigue

| KPI | Rule |
|-----|------|
| Hero CTA = 1 | §24 |
| 「다음에 뭘 해야 하지?」 never | FAIL if next action unclear |
| No multi-CTA hero row | Decision Fatigue FAIL |
| Evidence / Detail secondary | Never compete with Hero |
| Evidence points capped | Prefer ≤3 on primary surface |

---

## §26 Memory (S14/S15 bag sync closure)

### Turn pipeline (locked)

```text
Q → Answer → Conversation Memory → Understanding (merge + provenance + confidence)
  → Presenter → UI (Summary / Detail / Conclusion / Next Gap / next Q)
```

### Bag sync completion criteria (Acceptance)

| Criterion | PASS when |
|-----------|-----------|
| **No overwrite** | Prior answers / confirmed keys not clobbered by later turns or stage moves |
| **Key sync** | Field-establishing answer (e.g. `problem`) appears in Memory bag **and** Understanding same turn |
| **Stale prevent** | UI does not show obsolete Understanding after successful merge |
| **Reload persistence** | Refresh restores understanding, stage, conversation, confirmed/unknown (§27) |
| **Next-turn uses prior** | Question Engine reads prior Memory — not blank slate |
| **Survives stage move** | A→B→C→D does not drop Memory keys |

Baseline cite: S14 Confirmed Issue — ConversationMemory bag sync (`problem`); S15 backlog. Phase 1-B **closes** these criteria — experience hardening, not a new memory product.

---

## §27 Persistence matrix

| Must survive refresh / re-entry | Meaning |
|----------------------------------|---------|
| Understanding | Field claims + confidence |
| Stage | A–D + ✔●○ |
| Conversation | Continuity turns |
| Confirmed / Unknown | Confirmation + Critical Unknown set |
| Provenance | Source labels intact |
| Memory bag | §26 criteria after reload |

**FAIL if:** Refresh → empty form, loses VALIDATED facts, or re-asks Known doc content as open Q.

---

## §28 Demo / Auth Contract

| | Demo | Authenticated |
|--|------|-----------------|
| Understanding / Question / Stage / Review | **Same contract** | **Same contract** |
| Difference | Persistence / session lifetime / auth boundary only | Durable persistence / identity |

**Do not** fork “demo Understanding” vs “auth Understanding.”

---

## §29 Document Upload pipeline

| Step | Requirement |
|------|-------------|
| Accept PDF / plan | Clear loading / error / retry (§35) |
| Extract | Honest quality; Trust on weak |
| Map to Domain fields | Provenance DOCUMENT |
| **No filename-as-business-name** | Filename must **not** become business one-liner / project display name by default |
| Draft surface | Document First — never empty-form primacy |

---

## §30 Document Quality test set

Internal fixtures / scenarios CTO must cover before claiming Document PASS:

| Class | Intent |
|-------|--------|
| Strong / complete PDF | Full Document Intelligence path |
| Incomplete / thin PDF | Honest confidence + gap-only |
| Filename-only / near-empty extract | No fake document-read; Unknowns explicit |
| Conflicting claims in doc | Contradiction path |
| Non-PDF / corrupt / timeout | Error + Retry — no silent fail |

---

## §31 New User Experience

| Rule | Meaning |
|------|---------|
| **One minimal question** to start | Name / idea level — not a form wall |
| Then gap-driven | Question Priority only |
| Honest unknown | “AI가 모릅니다” then build |

---

## §32 Landing → Workspace branching

```text
Landing (entry only — no brand redesign)
  → Detect / choose: Document vs Idea
  → Workspace Unified Engine
  → Review / Validation when ready
```

Phase 1-A / 1-A.1 Landing closed — **no** Landing redesign in Phase 1-B.

---

## §33 Workspace UX priority order

1. What to do **next** (one Hero / one Q)  
2. Visible Understanding (Summary + Spine)  
3. Honest Processing / Trust  
4. Detail on demand  
5. Secondary navigation — never steals Hero  

---

## §34 Navigation

Navigation labels and IA follow **user journey** (Understand → Validate → Decide → Next action) — **not** AI internals (Memory bag, inference enums, engine names).

---

## §35 Loading / Error / Empty / Retry

| State | Requirement |
|-------|-------------|
| Loading | Staged meaning where Processing applies |
| Error | Visible; recoverable |
| Empty | Honest empty — not fake filled Understanding |
| Retry | Explicit control |
| **Review Start** | **No silent fail** — success / cannot / error must be explicit (§37) |

---

## §36 New Project

| Allowed at create | Forbidden |
|-------------------|-----------|
| **Name** + **review type** only | 8-character (or similar) barrier as create blocker |
| Clear entry to Journey A or B | Mini-questionnaire wall at create |

---

## §37 Review Start — success / cannot / error

| Outcome | UX |
|---------|-----|
| **Success** | Enter Review / Analysis path with handoff clarity |
| **Cannot** | Explain blocking gate (Contradiction / Critical Unknown / Stage) + one next action to unblock |
| **Error** | Visible error + Retry — **never silent fail** |

---

## §38 Mobile order integrity

Same engine; composition order preserved: Summary → Spine/Judgment → one Q or Hero → Detail secondary. No multi-CTA trap; no desktop-only dead ends.

---

## §39 Accessibility minimum

| Bar | Requirement |
|-----|-------------|
| Focus | Primary CTA / question reachable by keyboard |
| Labels | Controls named; status not color-only |
| Contrast | Readable Summary / errors |
| Motion | Understanding highlight must not be sole information channel |

---

## §40 Performance

| Rule | Meaning |
|------|---------|
| No re-ask confirmed | VALIDATED / USER_CONFIRMED skipped |
| No duplicate analysis | Same inputs must not re-run full analysis without cause |
| Prefer reuse | Understanding merge over full recompute when safe |

---

## §41 Token / AI Cost Control (CTO development itself)

| Discipline | Rule |
|------------|------|
| Docs-first | Spec before speculative LLM loops |
| No exploratory full-repo AI scans for this sprint’s own work | Targeted reads only |
| Prefer Mock / deterministic fixtures until intelligence proves value | Constitution: Real LLM only when justified |
| Cache / reuse Understanding | Avoid re-prompting confirmed fields |
| Log cost-sensitive calls in Impl | Measurable; no silent expensive loops |
| Mid-sprint | Do not burn tokens on OUT items (new provider, score model, Landing redesign) |

Mirrors EXECUTION_PLAN cost control.

---

## §42 Regression protect — S7 / S8 / S14 / S16 / S17

| Sprint | Protect |
|--------|---------|
| **S7 / S8** | Core trust / loop foundations — no unauthorized contract break |
| **S14** | ConversationMemory bag sync pain → Phase 1-B **closes** criteria; do not regress further |
| **S16** | Confirm-before-ask, one Hero, empty-start honesty |
| **S17** | Document First, Thinking stages, missing-field Q, Final Review before Analysis |

**Breaking any of the above requires explicit approval** before merge. Experience language only — not silent contract rewrites.

---

## §43 QA Matrix A1–A4 · B1–B4 · C1–C4 · D1–D4 · E1–E4 · F1–F4

**One final QA batch** after Implementation — not piecemeal CPO loops.

### A — Document

| ID | Case | PASS when |
|----|------|-----------|
| A1 | Complete PDF | Said / missing / Confirm Q; never re-ask Known; → handoff |
| A2 | Incomplete / weak PDF | Honest confidence; gap-only; still Journey A |
| A3 | Filename-only / near-empty | No fake document-read; no filename-as-business-name |
| A4 | Doc vs user conflict | Contradiction confirm; no silent overwrite |

### B — Conversation

| ID | Case | PASS when |
|----|------|-----------|
| B1 | VALID answer | Merge + confidence up; next Q from priority |
| B2 | Nonsense / IRRELEVANT | No ✔-pass; re-ask; stage stays ● |
| B3 | AMBIGUOUS / PARTIAL | Clarify; not VALIDATED |
| B4 | Follow-up 「왜?」 | Evidence → loop unbroken |

### C — State / Memory

| ID | Case | PASS when |
|----|------|-----------|
| C1 | Refresh | §27 survive |
| C2 | Resume | Continues; no full re-entry FAIL |
| C3 | Transition | Gates — not answer count |
| C4 | Memory bag sync | §26 all PASS |

### D — Product surfaces

| ID | Case | PASS when |
|----|------|-----------|
| D1 | Demo | Same Understanding Contract as Auth |
| D2 | Auth | Durable persistence; identical contract |
| D3 | Mobile | One Hero; order integrity |
| D4 | Desktop | Same engine; Decision Fatigue |

### E — Review / Analysis

| ID | Case | PASS when |
|----|------|-----------|
| E1 | Review Start success | Explicit success path |
| E2 | Review Start cannot | Blocking reason + unblock CTA |
| E3 | Review Start error | Visible + Retry; no silent fail |
| E4 | Evidence First + Hero=1 | Judgment → Evidence → Reasoning → Action |

### F — Cross-journey / regression

| ID | Case | PASS when |
|----|------|-----------|
| F1 | Journey B seed | One min Q; honest unknown; gap-driven |
| F2 | Correction / edit | USER_CORRECTED; Contradiction if needed |
| F3 | New Project | Name + review type only; no 8-char barrier |
| F4 | S16/S17 regression | Document First, Thinking, one Hero, confirm-before-ask HOLD |

---

## §44 Evidence Package 01–16

Live walkthrough evidence required for core flows (screenshots / short clips + notes). Code merge ≠ Evidence.

| # | Evidence |
|---|----------|
| 01 | Journey A — strong PDF Document First |
| 02 | Journey A — weak PDF honesty + gap-only |
| 03 | No filename-as-business-name |
| 04 | Provenance labels visible (incl. AI_INFERENCE) |
| 05 | Confidence ladder visible / skip re-ask |
| 06 | Contradiction confirm (no silent overwrite) |
| 07 | Answer Quality rejects nonsense ✔-pass |
| 08 | Staged Processing (no fake AI as fact) |
| 09 | Before→After Understanding update |
| 10 | Summary / Detail + Spine |
| 11 | Stage Transition announce (not answer count) |
| 12 | Review: Evidence First + Hero=1 |
| 13 | Memory bag sync + refresh persistence |
| 14 | Demo vs Auth same contract |
| 15 | Review Start cannot + error (no silent fail) |
| 16 | Mobile order + Decision Fatigue |

---

## §45 CEO Walkthrough A + B

| Walkthrough | Path |
|-------------|------|
| **A** | Document First → confirm → loop → Transition → Review / next action |
| **B** | Start From Idea → gap Q → loop → Transition → Review / next action |

CEO Walkthrough is a **completion gate** — not optional after merge. HOLD until CPO opens.

---

## §46 Sprint completion checklist

Phase 1-B is **done** only when **all** apply:

- [ ] CPO Scope **PASS** on this SCOPE + EXECUTION_PLAN  
- [ ] Implementation complete per EXECUTION_PLAN workstreams  
- [ ] §§0–50 Acceptance language met in product behavior  
- [ ] QA Matrix A1–F4 one batch PASS  
- [ ] Evidence Package 01–16 attached  
- [ ] Regression S7/S8/S14/S16/S17 protected (or approved exceptions)  
- [ ] CTO Final Report  
- [ ] CPO Review PASS  
- [ ] **CEO Walkthrough A + B** executed / accepted  

**Code merge ≠ done.**

---

## §47 Absolute bans on micro-sprints

| Ban | Meaning |
|-----|---------|
| No Phase 1-B.1 / 1-B.2 / 1-C splits | Everything under Phase 1-B |
| No “ship Understanding only, Validation later” as new Phase | Backlog item inside 1-B if blocked |
| Blockers stay in Phase 1-B backlog | Do not renumber to escape scope |
| No Scope Freeze claim mid-expansion | Status remains LONG SPRINT until CPO Review |

---

## §48 CTO process

```text
1. Docs first (SCOPE + EXECUTION_PLAN)     ← current
2. HOLD implementation until CPO Scope PASS
3. Long implementation per §49 / EXECUTION_PLAN
4. Report to CPO mid-sprint ONLY on blocker or scope change
5. Final package once (§50)
```

---

## §49 Recommended internal work order

Report to CPO only on **blocker** or **scope change**. Internal order (maps to EXECUTION_PLAN workstreams):

1. **Contracts** — Understanding · Provenance · Confidence · Domain 01–20 language lock  
2. **Document pipeline** — Upload · Quality · no filename-as-name · Journey A bans  
3. **Memory + Persistence** — §26 / §27 closure  
4. **Question + Answer Quality + Contradiction** — Engines  
5. **Processing + Understanding Update UX** — §§12–13  
6. **Spine · Summary/Detail · Correction · Follow-up** — §§14–17  
7. **Stage A–D · Transition · Validation handoff** — §§18–20  
8. **Analysis / Review Evidence First · Hero · Fatigue** — §§21–25  
9. **New User · Landing branch · New Project · Workspace UX / Nav** — §§31–34, §36  
10. **Loading/Error/Review Start · Mobile · A11y · Performance · Cost** — §§35, 37–41  
11. **Regression harness S7/S8/S14/S16/S17** — §42  
12. **QA Matrix · Evidence · CEO guides** — §§43–45  

---

## §50 Final CPO Gate package list

After Impl + QA + Evidence, CTO submits **once**:

| Item | Purpose |
|------|---------|
| CTO Final Report | What shipped vs SCOPE |
| AC checklist (§46) | Done = all |
| QA Matrix results A1–F4 | One batch |
| Evidence Package 01–16 | Live walkthrough |
| Regression note | S7/S8/S14/S16/S17 |
| Known Issues / Phase 1-B backlog | Honest blockers (no Phase split) |
| CEO Walkthrough A+B guide | Ready for CPO open |

CPO replies **once** with: **PASS** / **FIX** / **HOLD**.

---

## Explicit OUT

Do **not** include in Phase 1-B:

| OUT | Why |
|-----|-----|
| **New AI Provider** | No new LLM / PDF / auth providers |
| **New analysis engine** | No orchestration spine rewrite |
| **New score model** | Score supporting only; no score-led primary UX |
| **Marketplace** | Out of ALABOM Phase 1-B |
| **Dashboard / KPI widget walls** | Journey, not dashboards |
| **Auth redesign / structure changes** | High-risk — Demo/Auth = persistence only |
| **G2 / Generation-2 contract breaks** | No reopen |
| **Unauthorized S7 / S8 / S14 / S16 / S17 contract breaks** | KEEP; breaking needs approval |
| Mid-sprint Phase 1-B.1 / 1-C renumber | Structure under Phase 1-B only |
| Multi-CTA per stage / Review | Decision Fatigue FAIL |
| Long forms / empty full-form after upload | Journey A FAIL |
| “Just type manually” after weak PDF | Absolute ban |
| Batch-all-inputs-then-analyze | Contract FAIL |
| Fake progress as real AI work | Processing FAIL |
| Filename-as-business-name | Upload FAIL |
| LaunchLens brand restore | ALABOM display; `launchlens.*` storage keys **KEEP** |
| CartPilot / Platform SDK | Forbidden |
| Landing redesign beyond closed Phase 1-A / 1-A.1 | Closed |
| Phase 1-B **implementation** until CPO Scope PASS | **HOLD** |

---

## Baseline vs Gap (honest)

### Baseline `d6d0e91` (preserved — build on, do not erase)

Useful locked language retained and expanded here: two entries → one engine; Document Intelligence; provenance honesty; confidence; contradiction; Memory bag sync criteria; staged Processing; Question priority; answer quality; follow-up; Summary/Detail; stage model; transition gates; Review Decision Fatigue; Demo/Auth sameness; Explicit OUT; S16/S17 KEEP.

### What this expansion adds (CTO work-order depth)

Full §§0–50 work instruction: Domain 01–20; expanded provenance/confidence/answer enums; Stage A–D; Analysis Evidence First; upload/quality/new project/review-start/mobile/a11y/performance/cost; QA A1–F4; Evidence 01–16; CEO A+B; completion ≠ merge; process + work order + final gate package; companion EXECUTION_PLAN.

---

## Explicit non-claims

- **Zero product / UI / engine code** in this Scope Expansion  
- **Phase 1-B Implementation NOT started** (HOLD)  
- **No unauthorized S7 / S8 / S14 / S16 / S17 contract changes**  
- This doc is **NOT Freeze** and does **not** claim Freeze-ready  
- Does **not** authorize Impl, deploy, or CEO Walkthrough until CPO Scope PASS then later gates  

---

*Record only — Next Autonomous Target: single CPO Scope Review (PASS / FIX / HOLD) on SCOPE + EXECUTION_PLAN; Implementation remains HOLD. Status: 🟡 LONG SPRINT — Scope Expansion (CTO Work Order). Baseline: d6d0e91.*
