# ALABOM — AI Business Validation Experience v1

*(Folder/docs naming: Phase 1-B OK)*

```text
🟢 LONG SPRINT — EXECUTING
No mid Freeze · No mid Scope Review · No Phase split
Next CPO report = Final package only (unless escalation §29)
Baseline history: 6d9b8b7 · d6d0e91 · ea11e70 (reference only — not “Scope Freeze Candidate”)
Sprint identity: ALABOM — AI Business Validation Experience v1
```

**Date:** 2026-08-25  
**From:** CTO  
**Document type:** **Final product work order** (Long Sprint — implement)  
**Predecessor gates:** Phase 1-A / 1-A.1 **CLOSED** · prior HOLD / Freeze-candidate language **superseded**  
**Baseline history (preserved):** `6d9b8b7` / `d6d0e91` / `ea11e70` — do **not** delete history; do **not** claim Freeze.  
**Product track:** ALABOM Workspace first-experience — **core product experience** (AI Business Validation). Landing redesign **OUT**; **W1 Brand Concept 3 Progressive Loop** logo + favicon **IN**.  
**Constraint:** No mid-sprint Phase splits · no mid Scope Review · no feature-by-feature CPO approvals · no unauthorized S7–S17 state-contract breaks (escalate §29).  
**Companion:** [`ALABOM_PHASE1B_EXECUTION_PLAN.md`](./ALABOM_PHASE1B_EXECUTION_PLAN.md) · [`ALABOM_PHASE1B_PROGRESS.md`](./ALABOM_PHASE1B_PROGRESS.md)

**Sources (prefer docs language):**  
[`S17_SHARED_UNDERSTANDING_LOOP.md`](./S17_SHARED_UNDERSTANDING_LOOP.md) · [`S16_UX_RECOVERY.md`](./S16_UX_RECOVERY.md) · [`ALABOM_PHASE1A_REPORT.md`](./ALABOM_PHASE1A_REPORT.md) · [`ALABOM_PHASE1A_CPO_REVIEW.md`](./ALABOM_PHASE1A_CPO_REVIEW.md) · [`ALABOM_PHASE0_SCOPE_FREEZE.md`](./ALABOM_PHASE0_SCOPE_FREEZE.md) · S14/S15 ConversationMemory bag-sync pain · `docs/PRODUCT_VISION_V3.md` · SHA history `6d9b8b7`  

---

## Absolute ban — no mid-sprint Phase split (locked)

```text
Phase 1-B = AI Business Validation Experience (ONE LONG SPRINT)
 ├─ W1 Brand Concept 3 Progressive Loop (logo + favicon) & Entry
 ├─ Product Contract & Philosophy
 ├─ Journey A Document First + Journey B Start From Idea
 ├─ Unified Understanding Engine
 ├─ Business Understanding Domain + Provenance + Confidence
 ├─ Contradiction / Answer Quality / Question Engines
 ├─ AI Processing + Understanding Update UX
 ├─ Summary/Detail · Understanding Spine · Correction · Follow-up
 ├─ Stage Architecture A–D + Transition + Validation handoff
 ├─ Analysis Architecture (Evidence First; score supporting; Hero CTA=1)
 ├─ Memory · Persistence · Demo/Auth
 ├─ Document Upload + Quality · New User · Landing→Workspace
 ├─ Workspace UX · Navigation · Loading/Error · New Project · Review Start
 ├─ Mobile · A11y · Performance · Token/Cost Control
 ├─ Regression protect S7/S8/S14/S16/S17
 ├─ QA Matrix A–F · Evidence Package 01–20 · CEO Walkthrough A/B
 ├─ FAIL conditions §27 · Escalation-only CPO §29 · DoD §30
 └─ Final CPO package only
```

**Do not** invent Phase 1-B.1 / 1-B.2 / 1-C / 1-D mid-sprint. Blockers stay in **Phase 1-B backlog**. Code merge ≠ done.

---

## Table of contents

| § | Title |
|---|--------|
| 0 | Absolute product goal |
| 0b | W1 Brand — Concept 3 Progressive Loop |
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
| 26 | Memory + Persistence (S14/S15 bag sync) |
| 27 | FAIL conditions (canonical) |
| 28 | Demo / Auth Contract |
| 29 | Escalation-only CPO |
| 30 | Definition of Done (DoD) |
| 31 | Document Upload + Quality · New User · Landing→Workspace |
| 32 | Workspace UX · Nav · Loading/Error · New Project · Review Start |
| 33 | Mobile · A11y · Performance · Token/Cost |
| 34 | Regression protect S7/S8/S14/S16/S17 |
| 35 | QA Matrix A–F |
| 36 | Evidence Package 01–20 |
| 37 | CEO Walkthrough A + B |
| 38 | Absolute bans on micro-sprints |
| 39 | Internal work order W1–W12 |
| 40 | Final CPO Gate package |
| — | Explicit OUT · Gate statement · Baseline vs Gap · Non-claims |

---

## Gate statement

```text
Phase 1-A / 1-A.1 CLOSED
        ↓
Phase 1-B SCOPE + EXECUTION_PLAN (docs once; history SHAs preserved)
        ↓
🟢 LONG SPRINT — EXECUTING (W1–W12)  ← YOU ARE HERE
   No mid Freeze · No mid Scope Review · No Phase split
        ↓
Implement all → Targeted QA as you go → Internal QA batch
        ↓
Production QA → Evidence 01–20 → CTO Final Report
        ↓
CPO Final package only (§29 escalation exceptions)
        ↓
CEO Walkthrough A + B
```

**Explicit:** This is the **final product work order**. Implementation is **authorized and in progress**. Next CPO report = **Final package only** (unless §29 escalation).

---

## §0 Absolute product goal

> 사용자가 가진 정보(문서 또는 아이디어)를 입력하면 → ALABOM이 사업을 분석·이해하고 → 결과를 보여주며 → **AI 파트너 루프**(질문 → 답 → 이해 갱신 → 판단 → 다음 행동)로 사업성 검증까지 이어지는 **하나의 경험**을 완성한다.

| Input | Analysis | Result | Partner loop |
|-------|----------|--------|--------------|
| PDF / plan **or** minimal idea seed | Unified Understanding Engine | Summary · Spine · Judgment · Gaps | Ask → Answer → Process → Update → Transition → Validation |

**Exit = alpha-openable Business Validation Experience** — not green build alone, not “nice chat.”

---

## §0b W1 Brand — Concept 3 Progressive Loop (mandatory)

**Selected concept:** bottom-left collage quadrant — **“The Progressive Loop”** only (Concepts 1/2/4 OUT).

| Asset | Spec |
|-------|------|
| **Logo icon** | Continuous lowercase **al** loop; orange → coral/red gradient |
| **Wordmark** | **ALABOM** (bold black sans) + **알아봄** |
| **Favicon** | Same **al** loop on **light gray rounded square** |
| **Palette** | Warm orange/coral primary · light gray neutrals · black text |
| **Theme** | Progressive Loop / Shared Understanding Spine — “ALABOM doesn't just analyze; it reasons. See what's KNOWN and what's next.” |
| **Slogan vibe** | “AI processing you can trust, one step ahead.” |

**Acceptance:** Assets live under `apps/web/public/` (or brand folder); wired through `BRAND_CONFIG` + layout metadata / OG / manifest / JSON-LD as applicable. **LaunchLens** residual strings removed on branded surfaces. Landing redesign remains OUT — brand mark + favicon + chrome wordmark only.

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

## §26 Memory + Persistence (S14/S15 bag sync closure)

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
| **Reload persistence** | Refresh restores understanding, stage, conversation, confirmed/unknown (matrix below) |
| **Next-turn uses prior** | Question Engine reads prior Memory — not blank slate |
| **Survives stage move** | A→B→C→D does not drop Memory keys |

### Persistence matrix

| Must survive refresh / re-entry | Meaning |
|----------------------------------|---------|
| Understanding | Field claims + confidence |
| Stage | A–D + ✔●○ |
| Conversation | Continuity turns |
| Confirmed / Unknown | Confirmation + Critical Unknown set |
| Provenance | Source labels intact |
| Memory bag | Bag sync criteria after reload |

Baseline cite: S14 Confirmed Issue — ConversationMemory bag sync (`problem`); S15 backlog. Phase 1-B **closes** these criteria — experience hardening, not a new memory product.

---

## §27 FAIL conditions (canonical)

Any of the following is a **product FAIL** (blocks DoD §30):

| FAIL | Meaning |
|------|---------|
| Full re-entry after weak PDF | User forced to re-type plan / empty full-form primacy |
| “Just type manually” as primary path after weak extract | Absolute ban |
| Filename-as-business-name | Filename becomes business one-liner / display name by default |
| Re-ask Known / VALIDATED as open Q | Unless Contradiction or user edit |
| AI_INFERENCE shown as user fact / validated truth | Inference ≠ fact |
| Silent overwrite on Contradiction | Doc/user-confirmed truth disappears without acknowledge |
| Fake Processing presented as real AI work | Staged honesty required |
| Score / dashboard wall as first Review viewport | Evidence First FAIL |
| Hero CTA ≠ 1 / multi-CTA hero row | Decision Fatigue FAIL |
| Next action unclear («다음에 뭘 해야 하지?») | Dead-end FAIL |
| Refresh → empty form / lost VALIDATED / re-ask Known doc | Persistence FAIL |
| Demo Understanding ≠ Auth Understanding contract | Demo/Auth FAIL |
| Silent Review Start fail | Error/recovery FAIL |
| Unauthorized S7/S8/S14/S16/S17 **state contract** break without §29 | Regression FAIL |
| Mid-sprint Phase 1-B.1 / 1-C invent | Process FAIL |

---

## §28 Demo / Auth Contract

| | Demo | Authenticated |
|--|------|-----------------|
| Understanding / Question / Stage / Review | **Same contract** | **Same contract** |
| Difference | Persistence / session lifetime / auth boundary only | Durable persistence / identity |

**Do not** fork “demo Understanding” vs “auth Understanding.”

---

## §29 Escalation-only CPO

Mid-sprint CPO contact is **forbidden** except:

| Escalate when | Examples |
|---------------|----------|
| **Blocker** | Cannot proceed without product-vision change |
| **Unauthorized state-contract break** | S7/S8/S14/S16/S17 KEEP would break |
| **Scope change** | New provider / score model / auth redesign / G2 / marketplace |

**Do not** escalate for: Freeze requests · mid Scope Review · feature-by-feature approval · “W3 done?” · Phase renumber.

Presenter/Flow UX changes that preserve contracts = **continue**. Next scheduled CPO report = **Final package** (DoD §30).

---

## §30 Definition of Done (DoD)

Phase 1-B / Long Sprint is **done** only when **all** apply:

- [ ] W1–W12 Acceptance met (incl. **Brand Concept 3** logo + favicon)  
- [ ] Product §§0–25 + Memory/Persistence + Demo/Auth behavior met  
- [ ] No open §27 FAIL  
- [ ] QA Matrix A–F one batch PASS  
- [ ] Evidence Package **01–20** attached  
- [ ] Regression S7/S8/S14/S16/S17 protected (or §29-approved exception)  
- [ ] CTO Final Report  
- [ ] CPO Final Review PASS  
- [ ] **CEO Walkthrough A + B** executed / accepted  

**Code merge ≠ done. Green build ≠ done.**

---

## Document Upload pipeline (W2)

| Step | Requirement |
|------|-------------|
| Accept PDF / plan | Clear loading / error / retry |
| Extract | Honest quality; Trust on weak |
| Map to Domain fields | Provenance DOCUMENT |
| **No filename-as-business-name** | Filename must **not** become business one-liner / project display name by default |
| Draft surface | Document First — never empty-form primacy |
| Weak PDF | Show what was understood + **gap Q only** — never demand full re-entry |

### Document Quality test set

| Class | Intent |
|-------|--------|
| Strong / complete PDF | Full Document Intelligence path |
| Incomplete / thin PDF | Honest confidence + gap-only |
| Filename-only / near-empty extract | No fake document-read; Unknowns explicit |
| Conflicting claims in doc | Contradiction path |

---

## New User · Landing → Workspace · Workspace UX (W1 + chrome)

### New User Experience

One minimal seed question path for Journey B; honest unknown; AI leads.

### Landing → Workspace branching

No Landing redesign. Branch into Document First or Idea seed. Brand chrome uses Concept 3 mark.

### Workspace UX priority order

1. What AI understood (Summary / Spine)  
2. One next question or Hero action  
3. Judgment / Gaps  
4. Detail / Evidence secondary  

### Navigation

User journey — not AI internals dump.

### Loading / Error / Empty / Retry

Visible; Retry present; no silent fail on Review Start.

### New Project

Name + review type only; no 8-char barrier.

### Review Start

Success / cannot (blocking reason + unblock CTA) / error (visible + Retry).

---

## Mobile · A11y · Performance · Token/Cost

| Area | Rule |
|------|------|
| Mobile | One Hero; order integrity |
| A11y | Minimum labels / focus / contrast on primary loop |
| Performance | No re-ask confirmed; no duplicate analysis |
| Token / cost | Fixtures first; skip VALIDATED; targeted tests; no evidence spam until near end |

---

## Regression protect S7 / S8 / S14 / S16 / S17

| Keep | Meaning |
|------|---------|
| S7 / S8 | Prior KEEP contracts (Presenter/Flow OK) |
| S14 | Memory bag sync class |
| S16 | UX Recovery — Thinking, one Hero, honesty |
| S17 | Shared Understanding Loop — Document First, confirm-before-ask |

Unauthorized **state contract** breaks → **§29 escalate only**. Do not “fix” by inventing Phase 1-C.

---

## QA Matrix A–F

### A — Document First

| ID | Case | PASS when |
|----|------|-----------|
| A1 | Strong PDF | Draft Understanding; no empty-form primacy |
| A2 | Weak PDF | Honest Trust + gap-only; **no full re-entry** |
| A3 | Filename-only extract | No filename-as-business-name |
| A4 | Doc facts | Confirm-style; not open re-ask |

### B — Loop / engines

| ID | Case | PASS when |
|----|------|-----------|
| B1 | Answer → Processing → Update | Staged; Before→After visible |
| B2 | Contradiction | No silent overwrite; confirm Q |
| B3 | Answer Quality | Nonsense not ✔-pass |
| B4 | Spine / Summary / 「왜?」 | Known/next clear; Evidence → loop |

### C — State / Memory

| ID | Case | PASS when |
|----|------|-----------|
| C1 | Refresh | Persistence survive |
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

### F — Cross-journey / regression / brand

| ID | Case | PASS when |
|----|------|-----------|
| F1 | Journey B seed | One min Q; honest unknown; gap-driven |
| F2 | Correction / edit | USER_CORRECTED; Contradiction if needed |
| F3 | New Project + Brand | Name + review type; Concept 3 logo/favicon on branded surfaces |
| F4 | S16/S17 regression | Document First, Thinking, one Hero, confirm-before-ask HOLD |

---

## Evidence Package 01–20

Live walkthrough evidence required for core flows (screenshots / short clips + notes). Code merge ≠ Evidence.

| # | Evidence |
|---|----------|
| 01 | Journey A — strong PDF Document First |
| 02 | Journey A — weak PDF honesty + gap-only (no full re-entry) |
| 03 | No filename-as-business-name |
| 04 | Provenance labels visible (incl. AI_INFERENCE ≠ fact) |
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
| 17 | **Brand Concept 3** Progressive Loop logo + favicon |
| 18 | Correction / 「왜?」 loop unbroken |
| 19 | Validation handoff + S16/S17 regression note |
| 20 | CEO Walkthrough A+B readiness |

---

## CEO Walkthrough A + B

| Walkthrough | Path |
|-------------|------|
| **A** | Document First → confirm → loop → Transition → Review / next action |
| **B** | Start From Idea → gap Q → loop → Transition → Review / next action |

CEO Walkthrough is a **completion gate** — not optional after merge. HOLD until CPO opens Final package.

---

## Absolute bans on micro-sprints

| Ban | Meaning |
|-----|---------|
| No Phase 1-B.1 / 1-B.2 / 1-C splits | Everything under Phase 1-B |
| No “ship Understanding only, Validation later” as new Phase | Backlog item inside 1-B if blocked |
| Blockers stay in Phase 1-B backlog | Do not renumber to escape scope |
| No Scope Freeze claim | Status = **EXECUTING** until DoD |
| No mid Scope Review / feature CPO approvals | Final package only (§29 exceptions) |

---

## Internal work order W1–W12

Report to CPO only on **§29 escalation**. Internal order (maps to EXECUTION_PLAN):

1. **W1 Brand & Entry** — Concept 3 Progressive Loop logo + favicon · BrandConfig/OG · LaunchLens residual purge · New User / Landing→Workspace  
2. **W2 Document Understanding** — Upload · Quality · Journey A bans  
3. **W3 Understanding Engine** — Domain · Provenance · Confidence · Memory/Persistence  
4. **W4 Spine UI** — Shared Understanding Spine  
5. **W5 Question Loop** — one Q · Priority · skip Known  
6. **W6 Answer / Processing / Contradiction** — Quality · staged Processing · Before→After  
7. **W7 Summary / Detail**  
8. **W8 Why / Correction / Follow-up**  
9. **W9 Stage Transition** A–D  
10. **W10 Evidence-first Review** · Score supporting · Hero CTA=1 · Fatigue  
11. **W11 Validation + Regression** S7/S8/S14/S16/S17  
12. **W12 QA · Evidence 01–20 · CEO guides · Final CPO package**  

---

## Final CPO Gate package list

After Impl + QA + Evidence, CTO submits **once**:

| Item | Purpose |
|------|---------|
| CTO Final Report | What shipped vs SCOPE |
| DoD checklist (§30) | Done = all |
| QA Matrix results A–F | One batch |
| Evidence Package 01–20 | Live walkthrough |
| Regression note | S7/S8/S14/S16/S17 |
| Known Issues / Phase 1-B backlog | Honest blockers (no Phase split) |
| CEO Walkthrough A+B guide | Ready for CPO open |

CPO replies **once** with: **PASS** / **FIX** / **HOLD**.

---

## Explicit OUT

Do **not** include in this Long Sprint:

| OUT | Why |
|-----|-----|
| **New AI Provider** | No new LLM / PDF / auth providers |
| **New analysis engine** | No orchestration spine rewrite |
| **New score model** | Score supporting only; no score-led primary UX |
| **Marketplace** | Out |
| **Dashboard / KPI widget walls** | Journey, not dashboards |
| **Auth redesign / structure changes** | High-risk — Demo/Auth = persistence only |
| **G2 / Generation-2 contract breaks** | No reopen |
| **Unauthorized S7 / S8 / S14 / S16 / S17 state-contract breaks** | KEEP; breaking needs §29 |
| Mid-sprint Phase 1-B.1 / 1-C renumber | Structure under Phase 1-B only |
| Mid Freeze / mid Scope Review | Process OUT |
| Concepts 1 / 2 / 4 brand marks | **Concept 3 only** |
| Landing redesign beyond closed Phase 1-A / 1-A.1 | Closed; brand mark OK |
| LaunchLens brand restore on display surfaces | ALABOM display; `launchlens.*` storage keys **KEEP** |
| CartPilot / Platform SDK | Forbidden |

---

## Baseline vs Gap (honest)

### Baseline history (preserved — build on, do not erase)

Useful locked language retained: two entries → one engine; Document Intelligence; provenance honesty; confidence; contradiction; Memory bag sync; staged Processing; Question priority; answer quality; follow-up; Summary/Detail; stage model; transition gates; Review Decision Fatigue; Demo/Auth sameness; Explicit OUT; S16/S17 KEEP. SHAs: `6d9b8b7` · `d6d0e91` · `ea11e70`.

### What this work order locks for EXECUTING

W1 Brand Concept 3; Domain 01–20; expanded provenance/confidence/answer enums; Stage A–D; Analysis Evidence First; Hero=1; upload/quality/new project/review-start/mobile/a11y/performance/cost; QA A–F; Evidence **01–20**; CEO A+B; **§27 FAIL · §29 escalation · §30 DoD**; companion EXECUTION_PLAN; **implementation authorized**.

---

## Explicit non-claims

- Does **not** claim Scope Freeze Candidate  
- Does **not** invent Phase 1-B.1 / 1-C  
- Does **not** authorize unauthorized S7 / S8 / S14 / S16 / S17 state-contract changes  
- Does **not** invent new AI provider / score model / marketplace / auth redesign / G2  
- Status is **EXECUTING** — complete only when DoD §30 met end-to-end  

---

*Record only — Next Autonomous Target: implement W1→W12; Final CPO at package. Status: 🟢 LONG SPRINT — EXECUTING. Baseline history: 6d9b8b7.*
