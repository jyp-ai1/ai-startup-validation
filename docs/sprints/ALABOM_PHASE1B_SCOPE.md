# ALABOM Phase 1-B — Scope Review (CPO)

**Date:** 2026-08-25  
**From:** CTO → CPO  
**Status:** **Scope Review ONLY** · **Implementation NOT started**  
**Predecessor gates:** Phase 1-A / 1-A.1 **CLOSED** · Phase 1-B **IMPLEMENTATION HOLD** · **CEO HOLD**  
**Product track:** Workspace first-experience AI UX (ALABOM) — builds on S16/S17 contracts; does **not** reopen brand Landing work.

**Sources (prefer docs):**  
[`S17_SHARED_UNDERSTANDING_LOOP.md`](./S17_SHARED_UNDERSTANDING_LOOP.md) · [`S16_UX_RECOVERY.md`](./S16_UX_RECOVERY.md) · [`ALABOM_PHASE1A_REPORT.md`](./ALABOM_PHASE1A_REPORT.md) · [`ALABOM_PHASE1A_CPO_REVIEW.md`](./ALABOM_PHASE1A_CPO_REVIEW.md) · [`ALABOM_PHASE0_SCOPE_FREEZE.md`](./ALABOM_PHASE0_SCOPE_FREEZE.md) · `docs/PRODUCT_VISION_V3.md`

---

## Gate statement

```text
Phase 1-A / 1-A.1 CLOSED
        ↓
Phase 1-B Scope Review  ← YOU ARE HERE (this doc)
        ↓
CPO Review → Scope Freeze
        ↓
Implementation (blocked until Freeze)
        ↓
Internal QA → CPO Review → CEO Walkthrough
```

**Explicit:** Phase 1-B **implementation has NOT started.** This document is scope language only — no code, UI, or engine changes in this deliverable.

---

## A. User Journey

### Flow A — Document User

**Intent:** User already has a plan/document. AI understands first; user never re-enters the whole form.

```text
PDF/문서 업로드
  → AI understand (parse / draft Shared Understanding)
  → summarize (사업·고객·문제 ± 시장·경쟁 — Document First)
  → gaps (부족한 필드 식별)
  → Question (최고-priority gap만)
  → Answer
  → Processing (Thinking / Memory 가시화)
  → update (Shared Understanding 반영)
  → confirm (사용자 확인)
  → next Question …
  → review (Final Review of full understanding)
  → next action (분석 / Hero 다음 행동)
```

**Hard rule:** After upload, the user **must never** be forced to re-enter all fields. Empty full-form primacy after PDF is a **FAIL** (S17 P0-1 / S16 HOLD philosophy gap closed in S17; Phase 1-B must preserve and harden this).

### Flow B — New User

**Intent:** No document. Minimal questions; AI builds understanding incrementally.

```text
최소 질문 (이름/아이디어 수준)
  → Answer
  → AI understand (partial Shared Understanding)
  → gap
  → next Question
  → … (Turn Contract 반복)
  → validation-ready (Final Review → Analysis / judgment)
```

**Hard rule:** Flow B is **not** Flow A with a blank PDF. No fake “document read” confidence. Seed path admits unknowns (S16 P0-5), then gap-driven questions only.

### Flow separation (product)

| | Flow A | Flow B |
|--|--------|--------|
| Entry | Document upload / paste | Empty / idea-only project or Demo-without-doc |
| First surface | AI draft summary + Confidence + confirm | Minimal Q → AI draft grows |
| Re-entry of all fields | **Forbidden** | N/A (there was no full form) |
| Shared spine | Same Turn Contract + Stage table | Same Turn Contract + Stage table |

---

## B. Stage table

Canonical stages for Phase 1-B Scope (CPO checklist order). Each stage advances only when **confidence + confirmation** allow — never by answer count alone.

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

## C. Turn Contract

Every interaction turn **must** follow this order:

```text
Answer
  → Processing          (visible Thinking / Memory / Business update)
  → Updated Understanding
  → Gap                 (what is still missing)
  → Question            (one gap-driven question)
  → User Confirmation   (맞습니다 / 아닙니다 · 수정)
```

### Nonsense / low-signal answers

- Nonsense, empty, or off-topic answers **must NOT auto-complete** a stage.
- Stage status stays **● 현재 확인 중** (or returns to ask again); never silent **✔ 확인됨**.
- No “PASS by answer length” or quiz-tick advancement.

---

## D. UI Contract

Per stage, the Workspace surface exposes **exactly these roles** (names may be localized; roles are fixed):

| Role | Purpose |
|------|---------|
| **Summary** | AI’s current understanding of this stage (short) |
| **More** | Optional detail — not a second primary CTA |
| **AI Conclusion** | What AI believes is true *now* for this stage |
| **User Question** | The single gap-driven question |
| **Next Step** | One primary CTA for this stage |

**One CTA per stage.** No multi-CTA hero rows during understanding loop.

### Stage status marks

| Mark | Meaning |
|------|---------|
| **✔ 확인됨** | User confirmed; stage may advance |
| **● 현재 확인 중** | Active stage — Processing / Question / awaiting confirm |
| **○ 아직 확인 전** | Not yet reached or insufficient confidence |

---

## E. Acceptance Criteria (CPO checklist)

Use this list **exactly** for later Freeze / QA. All must PASS for Phase 1-B to exit Scope → Impl → CPO.

- [ ] **PDF first** — Document User path starts from upload/parse, not from empty form
- [ ] **No full re-entry** — After upload, user never re-enters all fields
- [ ] **Processing visible** — Answer → visible Processing before next Question
- [ ] **Answer updates understanding** — Each valid answer changes Shared Understanding (visible)
- [ ] **Gap-driven Q** — Next question comes from highest-priority gap, not fixed quiz order alone
- [ ] **Nonsense not PASS** — Nonsense / empty answers do not mark stage ✔
- [ ] **Stage advance on confidence** — Advance requires confidence + confirmation, not turn count
- [ ] **Summary + Detail** — Summary always; More/Detail available without second primary CTA
- [ ] **One CTA** — Exactly one primary Next Step per stage
- [ ] **Flow A vs B separated** — Document path and New User path are distinct entries sharing Turn Contract

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
| **Explicit User Confirmation every turn** | S17 updates understanding + Final Review exists; per-turn Confirm as hard Turn Contract may need tightening |
| **Nonsense ≠ stage PASS** | No dedicated quality gate documented as Acceptance; must be specified + tested in 1-B |
| **UI Contract roles** | Summary / More / AI Conclusion / User Question / Next Step + ✔●○ not fully named as the Workspace chrome |
| **Flow A vs B product framing** | Both paths exist in S16/S17; ALABOM 1-B must make separation **user-obvious** and Acceptance-tested |
| **Confidence-gated stage advance** | Confidence UX exists on Document First draft (S17 P1-1); stage-wide advance-on-confidence is broader than current loop issue resolution |
| **Workspace brand strings** | Phase 1-A closed Landing; Workspace LaunchLens residuals remain **out of 1-A** — brand display soft-fix may accompany 1-B only if CPO Freezes it; **not** a LaunchLens brand restore |

**Bottom line for Freeze:** S17 already delivers the **philosophy** (AI drafts → user confirms → gap questions → visible updates). Phase 1-B is **experience hardening + stage/UI/Turn contracts**, not a greenfield engine.

---

## G. Out of Scope

Do **not** include in Phase 1-B Scope Freeze:

- Dashboards / KPI widget walls
- New scores as primary UX
- Engine rewrite (`businessPlan.generate`, AI provider ports, orchestration spine)
- Multi-CTA per stage
- Long forms / empty full-form after upload
- LaunchLens **brand restore** (ALABOM remains display brand; `launchlens.*` storage keys **KEEP**)
- Breaking **S7–S16** contracts (Trust, confirm-before-ask, stage-first progress, one Hero, review gate)
- CartPilot / Platform SDK
- CEO Walkthrough before CPO opens that gate
- Landing redesign beyond already-closed Phase 1-A / 1-A.1

---

## H. Gates

```text
Phase 1-B Scope Review (this doc)
  → CPO Review (PASS / 수정 / HOLD)
  → Scope Freeze
  → Implementation
  → Internal QA
  → CPO Review
  → CEO Walkthrough   (still HOLD until CPO opens)
```

| Item | Status |
|------|--------|
| Phase 1-A / 1-A.1 | **CLOSED** |
| Phase 1-B Scope Review | **THIS DOC** — awaiting CPO |
| Phase 1-B Scope Freeze | ⛔ blocked |
| Phase 1-B Implementation | ⛔ **NOT started** |
| CEO Walkthrough | **HOLD** |

### CPO decision needed

Reply with one of:

- **PASS** → allow Scope Freeze draft / lock Acceptance E as freeze input  
- **수정** → list journey / stage / UI / AC deltas (implementation still HOLD)  
- **HOLD** → keep Implementation HOLD; no Freeze  

---

## Explicit non-claims

- **Zero product / UI / engine code changes** in this Scope Review session  
- **Phase 1-B Implementation NOT started**  
- This doc does not authorize Impl, deploy, or CEO Walkthrough  

---

*Next Autonomous Target (record only): CPO PASS/수정/HOLD on this Scope Review; on PASS → Scope Freeze language lock; Implementation remains HOLD until Freeze.*
