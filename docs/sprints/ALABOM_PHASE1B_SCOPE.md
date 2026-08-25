# ALABOM Phase 1-B — Scope Revision (CPO Freeze)

**Date:** 2026-08-25  
**From:** CTO → CPO  
**Status:** **Scope Revision submitted** → **awaiting CPO Freeze** · **Implementation HOLD** (NOT started)  
**Predecessor gates:** Phase 1-A / 1-A.1 **CLOSED** · Phase 1-B **IMPLEMENTATION HOLD** · **CEO HOLD**  
**Product track:** Workspace first-experience AI UX (ALABOM) — builds on S16/S17 contracts; does **not** reopen brand Landing work.  
**Constraint:** Docs-only revision. **No code, no deploy, no Phase 1-B impl, no S7–S17 contract changes** in this deliverable.

**Sources (prefer docs):**  
[`S17_SHARED_UNDERSTANDING_LOOP.md`](./S17_SHARED_UNDERSTANDING_LOOP.md) · [`S16_UX_RECOVERY.md`](./S16_UX_RECOVERY.md) · [`ALABOM_PHASE1A_REPORT.md`](./ALABOM_PHASE1A_REPORT.md) · [`ALABOM_PHASE1A_CPO_REVIEW.md`](./ALABOM_PHASE1A_CPO_REVIEW.md) · [`ALABOM_PHASE0_SCOPE_FREEZE.md`](./ALABOM_PHASE0_SCOPE_FREEZE.md) · `docs/PRODUCT_VISION_V3.md`

---

## Gate statement

```text
Phase 1-A / 1-A.1 CLOSED
        ↓
Phase 1-B Scope Review (prior)
        ↓
Phase 1-B Scope Revision  ← YOU ARE HERE (this doc; CPO 수정 incorporated)
        ↓
CPO Freeze (awaiting)
        ↓
Implementation (blocked until Freeze)  ← still HOLD
        ↓
Internal QA → CPO Review → CEO Walkthrough
```

**Explicit:** Phase 1-B **implementation has NOT started.** This document is scope language only — no code, UI, or engine changes in this deliverable.

---

## A. User Journey

### Document Flow (first) — failure condition

**Intent:** User already has a plan/document. AI understands first; user never re-enters the whole form.

**Canonical sequence (locked):**

```text
PDF → AI parse → summary → gaps → confirm Q
  → Answer
  → [AI 분석중...] (Memory / Understanding reflect — immediate)
  → Updated Understanding → Gap → next Q …
  → review (enough → Final Review)
  → next action
```

**FAIL if:** After upload, the user is forced to **re-enter full business fields** (empty full-form primacy, or any path that makes Document Flow feel like “start the form over”). This is a hard product FAIL for Phase 1-B (preserves S17 P0-1 / Document First).

### New User Flow

**Intent:** No document. Minimal questions; AI builds understanding incrementally.

```text
minimal Q (이름/아이디어 수준)
  → Answer
  → [AI 분석중...] → merge → Updated Understanding → Gap → next Q
  → … (Final UX Contract 반복)
  → enough → review → next action
```

**Hard rule:** New User Flow is **not** Document Flow with a blank PDF. No fake “document read” confidence. Seed path admits unknowns (S16 P0-5), then gap-driven questions only.

### Two-flow comparison (CPO)

| | Document Flow | New User Flow |
|--|---------------|---------------|
| Start | document | minimal Q |
| AI role | document-first | answer-based initial understand |
| User input | gaps/uncertainty only | gradual minimal info |
| Core | minimize re-entry | minimize cognitive load |
| End | enough → review | enough → review |

Shared spine after entry: same **Final UX Contract** + Stage table. Paths must remain **user-obvious** and Acceptance-tested as distinct entries.

---

## B. Stage table

Canonical stages for Phase 1-B Scope (CPO checklist order). Each stage advances only when **confidence + confirmation** allow — never by answer count alone, and never by polite ack alone (see Nonsense).

| 단계 | AI가 알고 있는 것 | 부족한 것 | 다음 질문 | 완료 조건 |
|------|-------------------|-----------|-----------|-----------|
| **business** | 무엇을 하는지 (사업 한 줄) | 모호한 카테고리/범위 | 「이 사업은 한 문장으로 무엇인가요?」 | 사용자 확인 + 비어 있지 않은 이해 문장 |
| **customer** | 누구를 위한지 | 구체 페르소나/지불자 | 「누가 돈을 내고 쓰나요?」 | 확인됨 + customer 필드 확정 |
| **problem** | 어떤 고통/직무 | 문제 깊이·빈도 | 「그 고객이 지금 가장 아픈 점은?」 | 확인됨 + problem 필드 확정 |
| **solution** | 제안 방향(있다면) | 차별화된 해결 가설 | 「그 문제를 어떻게 풀어 주나요?」 | 확인됨 + solution 가설 문장 |
| **market** | 대략 시장 맥락 | 규모·진입 근거 | 「시장/채널은 어디를 보나요?」 | 확인됨 + market 근거 1개 이상 |
| **competitor** | 대체재/경쟁 인식 | 직접 경쟁·차별점 | 「비슷한 선택지는 무엇인가요?」 | 확인됨 + competitor 인식 |
| **revenue** | 수익 힌트(있다면) | 누가·어떻게 내는지 | 「돈은 어떻게 들어옵니까?」 | 확인됨 + revenue 모델 초안 |
| **risk** | 리스크 후보 | 치명 리스크 우선순위 | 「가장 위험한 가정은?」 | 확인됨 + top risk 1개 |
| **judgment** | 누적 Shared Understanding | GO/HOLD용 최종 합의 | Final Review 「✓ 맞습니다」 | 전체 확인 + next action 1개 |

**Note for Freeze later:** Today’s S17 spine prioritizes **business / customer / problem** (+ draft market/competitor); issue IDs cover customer, problem, bm, competitor, market. **solution / revenue / risk / judgment-as-stage** are Scope targets for Phase 1-B — not claimed as already complete.

---

## C. Final UX Contract (locked — Phase 1-B core)

**This is the Phase 1-B core Contract.** All Document / New User turns must use this locked turn shape. Deviating from it is out of Scope Freeze compliance.

```text
AI가 이해한 내용 → [더보기] → 상세 → AI 판단/결론 → 현재 부족한 부분 → 질문 → 사용자 답변 → [AI 분석중...] → 업데이트된 이해 → 다음 질문 또는 다음 단계
```

### Immediate Memory / Understanding reflect (mandatory)

Per answer, the loop **must** be:

```text
Answer
  → [AI 분석중...]          (visible; Thinking / Memory)
  → merge with prior understanding
  → Updated Understanding
  → Gap
  → next Q   (or next stage when enough)
```

**Forbidden:** Batch-all-inputs-then-analyze (collect many answers first, then one late analysis). Understanding must reflect **immediately** after each answer.

### Nonsense / low-signal answers

- Nonsense, empty, or off-topic answers **may be saved** (for audit / memory honesty).
- They **must NOT** pass the stage with a polite “확인했습니다” (or equivalent auto-ack that marks ✔).
- AI **re-judges sufficiency** after the answer; if insufficient → **re-ask** (stage stays ● 현재 확인 중).
- No “PASS by answer length,” quiz-tick, or silent ✔ 확인됨.

---

## D. UI Contract

Per stage, the Workspace surface exposes **exactly these roles** (names may be localized; roles are fixed; maps to Final UX Contract):

| Role | Purpose |
|------|---------|
| **Summary** | AI가 이해한 내용 (short) |
| **More** | [더보기] → 상세 — not a second primary CTA |
| **AI Conclusion** | AI 판단/결론 — what AI believes is true *now* |
| **Gap** | 현재 부족한 부분 |
| **User Question** | The single gap-driven question |
| **Processing** | [AI 분석중...] after user answer |
| **Updated Understanding** | Merge result visible before next Q |
| **Next Step** | One primary CTA — 다음 질문 또는 다음 단계 |

**One CTA per stage.** No multi-CTA hero rows during understanding loop.

### Stage status marks

| Mark | Meaning |
|------|---------|
| **✔ 확인됨** | User confirmed **and** AI judged sufficient; stage may advance |
| **● 현재 확인 중** | Active stage — Processing / Question / awaiting confirm / re-ask after nonsense |
| **○ 아직 확인 전** | Not yet reached or insufficient confidence |

---

## E. Acceptance Criteria (CPO checklist)

Use this list **exactly** for later Freeze / QA. All must PASS for Phase 1-B to exit Freeze → Impl → CPO. Wording aligned with FAIL conditions above.

- [ ] **PDF first** — Document Flow starts: PDF → AI parse → summary → gaps → confirm Q (not empty form)
- [ ] **No full re-entry (FAIL)** — After upload, user is **never** forced to re-enter full business fields; empty full-form primacy = **FAIL**
- [ ] **Immediate reflect** — Answer → [AI 분석중...] → merge → Updated Understanding → Gap → next Q (visible each turn)
- [ ] **No batch-then-analyze** — Forbidden to collect all inputs then analyze once
- [ ] **Answer updates understanding** — Each turn changes Shared Understanding when signal is usable (visible)
- [ ] **Gap-driven Q** — Next question from highest-priority gap, not fixed quiz order alone
- [ ] **Nonsense not PASS** — Nonsense/empty may save but must **not** pass stage via “확인했습니다”; AI re-judges → re-ask if needed
- [ ] **Stage advance on confidence** — Advance requires confidence + confirmation + sufficiency, not turn count
- [ ] **Final UX Contract** — Every turn follows the locked turn shape (Section C)
- [ ] **Summary + Detail** — Summary always; [더보기]/Detail without second primary CTA
- [ ] **One CTA** — Exactly one primary Next Step per stage (다음 질문 또는 다음 단계)
- [ ] **Flow separation** — Document Flow vs New User Flow match the comparison table (Section A); share Final UX Contract only after distinct entry

---

## F. Baseline vs Gap (honest)

### Current baseline (cite — do not rewrite)

| Area | What already exists | Cite |
|------|---------------------|------|
| Document First / no empty-form primacy | S17 P0-1 PASS | `docs/sprints/S17_SHARED_UNDERSTANDING_LOOP.md` |
| Loop reflect + Thinking stages | Answer → Thinking → SU highlight | `workspace-ai-pm-thinking-stages.tsx`, `thinking-stages.ts`, S17 P0-2/P0-3 |
| Missing-field priority Q | customer / problem / business (+ diagnosis fallback) | `resolve-missing-field-priority.ts`, S17 P0-5 |
| Shared Understanding draft | business / customer / problem ± market / competitor | `build-shared-understanding.ts` |
| Confirm before first ask | S16 P0-2 | `workspace-ai-pm-main.tsx`, `workspace-ai-pm-loop-panel.tsx` |
| Trust honesty on weak PDF | Trust Block | `workspace-document-trust-block.tsx`, `workspace-document-eligibility.ts` |
| Empty / no-doc start | Seed “AI가 모릅니다” | `build-empty-project-seed.ts`, S16 P0-5 |
| Final Review before Analysis | P1-3 | S17; loop panel / final-understanding confirm |
| One Hero post-analysis | S16 P0-4 | `present-analysis-screen.ts` |
| Demo entry | Demo start surface | `demo-start-view.tsx` |
| State / progress stages | Pre-analysis stage labels (not 9-stage table) | `workspace-state.ts` |
| Memory / apply answer | Loop answer → memory / understanding | `apply-ai-pm-loop-answer.ts`, `conversation-memory-store.ts`, `build-ai-pm-shared-memory.ts` |

### What Phase 1-B would still need (honest gaps)

| Gap | Why it matters for CPO Freeze |
|-----|-------------------------------|
| **9-stage model vs today’s spine** | Stage table (solution / revenue / risk / judgment) is not yet a first-class UI/status contract |
| **Final UX Contract as hard chrome** | Locked turn shape (Section C) must be Workspace-visible end-to-end, not only philosophy |
| **Immediate reflect enforced** | Forbid any batch-all-inputs-then-analyze path in Acceptance / QA |
| **Nonsense ≠ stage PASS** | May save; must re-judge sufficiency and re-ask — dedicated quality gate + tests |
| **UI Contract roles** | Summary / More / AI Conclusion / Gap / Q / Processing / Updated Understanding / Next Step + ✔●○ |
| **Flow A vs B product framing** | Comparison table must be user-obvious and Acceptance-tested |
| **Confidence-gated stage advance** | Confidence UX exists on Document First draft (S17 P1-1); stage-wide advance-on-confidence is broader |
| **Workspace brand strings** | Phase 1-A closed Landing; Workspace LaunchLens residuals remain **out of 1-A** — brand display soft-fix may accompany 1-B only if CPO Freezes it; **not** a LaunchLens brand restore |

**Bottom line for Freeze:** S17 already delivers the **philosophy** (AI drafts → user confirms → gap questions → visible updates). Phase 1-B is **experience hardening + Final UX Contract / stage / UI**, not a greenfield engine. **No S7–S17 contract rewrites** in this Scope revision.

---

## G. Out of Scope

Do **not** include in Phase 1-B Scope Freeze:

- Dashboards / KPI widget walls
- New scores as primary UX
- Engine rewrite (`businessPlan.generate`, AI provider ports, orchestration spine)
- Multi-CTA per stage
- Long forms / empty full-form after upload (Document Flow **FAIL**)
- Batch-all-inputs-then-analyze
- LaunchLens **brand restore** (ALABOM remains display brand; `launchlens.*` storage keys **KEEP**)
- Breaking **S7–S17** contracts (Trust, confirm-before-ask, Document First, Thinking, one Hero, review gate) — Scope revises **experience language only**; no contract reopen in this doc
- CartPilot / Platform SDK
- CEO Walkthrough before CPO opens that gate
- Landing redesign beyond already-closed Phase 1-A / 1-A.1
- Phase 1-B **implementation** until CPO Freeze

---

## H. Gates

```text
Phase 1-B Scope Revision (this doc)
  → CPO Freeze (PASS lock / 추가 수정 / HOLD)
  → Implementation          ← still HOLD until Freeze
  → Internal QA
  → CPO Review
  → CEO Walkthrough         (still HOLD until CPO opens)
```

| Item | Status |
|------|--------|
| Phase 1-A / 1-A.1 | **CLOSED** |
| Phase 1-B Scope Review | prior — superseded by this Revision |
| Phase 1-B Scope Revision | **SUBMITTED** — awaiting CPO Freeze |
| Phase 1-B Scope Freeze | ⛔ awaiting CPO |
| Phase 1-B Implementation | ⛔ **HOLD** · **NOT started** |
| CEO Walkthrough | **HOLD** |

### CPO decision needed

Reply with one of:

- **Freeze** → lock Sections A–E (Final UX Contract + Acceptance) as Freeze input; only then allow Impl kickoff  
- **수정** → list journey / Contract / AC deltas (implementation still HOLD)  
- **HOLD** → keep Implementation HOLD; no Freeze  

---

## Explicit non-claims

- **Zero product / UI / engine code changes** in this Scope Revision session  
- **Phase 1-B Implementation NOT started** (HOLD)  
- **No S7–S17 contract changes** in this doc  
- This doc does not authorize Impl, deploy, or CEO Walkthrough  

---

*Next Autonomous Target (record only): CPO Freeze / 수정 / HOLD on this Scope Revision; on Freeze → Impl gate opens; Implementation remains HOLD until Freeze.*
