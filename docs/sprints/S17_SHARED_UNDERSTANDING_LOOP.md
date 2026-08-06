# S17 — Shared Understanding Loop 2.0

**Sprint:** S17  
**Status:** In progress → **P0/P1 implementation landed** (see `S17_PROGRESS.md`)  
**Theme:** AI understands first; user verifies (not fills empty forms).  
**Product:** LaunchLens only  
**Predecessor:** S16 UX Recovery — Implementation + Internal QA PASS · CEO Walkthrough **HOLD** (philosophy gap: empty fields after upload)

---

## Mission

Change user impression from:

> “I uploaded a PDF but I have to type everything”

to:

> “AI drafted understanding; I only confirm/correct.”

**Not the goal:** Raising raw AI/LLM accuracy.  
**Goal:** Make thinking + understanding updates visible every turn.

---

## Before → After

| Moment | Before (S16 HOLD gap) | After (S17) |
|--------|----------------------|-------------|
| After PDF upload | Trust/Reading → confirm card, but Edit path = empty domain form | Document First draft (Business/Customer/Problem ± Market/Competitor) + Confidence → 「제가 이렇게 이해했습니다」→ 맞습니다/아닙니다. **No empty form as first UX** |
| Loop turn | Answer → spinner → next Q (quiz feel) | Answer → staged Thinking (Memory → Business update → next Q) → SU highlight → 「이렇게 이해를 수정했습니다」→ next Q |
| Question pick | Gap scores + fixed order fallback | Highest-priority **missing field** drives next question |
| Before Analysis | Bare 「검토 시작」 | Final Review of full AI understanding → ✓ 맞습니다 → Analysis |

---

## Acceptance

### P0 (must)

| ID | Criterion | Done when |
|----|-----------|-----------|
| P0-1 | **Document First UX** | After upload: AI parsing → draft fields + Confidence → confirm/correct. Empty input form must not be the post-upload primary surface. Weak PDF: honest Trust + partial draft + confirm (still no empty form). |
| P0-2 | **Loop = Q→A→immediate reflect** | Each answer → Thinking 1–2s → Shared Understanding update → 「이렇게 이해를 수정했습니다」→ next Q. AI grows every turn. |
| P0-3 | **Thinking State** | Staged loading: Memory / Business update / next question (~1–2s), using real work time where possible. |
| P0-4 | **Shared Understanding animation** | Fade + yellow highlight ~1–2s on changed fields. |
| P0-5 | **Questions from missing-info priority** | Highest-priority missing field drives next question (not fixed quiz feel). |

### P1

| ID | Criterion | Done when |
|----|-----------|-----------|
| P1-1 | Confidence UX | % + 문서확인 / 추론 필요 labels on draft |
| P1-2 | Auto-save feedback | `✓ AI 이해 업데이트 완료` (not generic saved) |
| P1-3 | Final Review before Analysis | Full AI understanding → ✓ 맞습니다 → Analysis |

---

## Work order (locked)

1. **S17-1** Document First (parsing, confidence, remove empty-form primacy)
2. **S17-2** Shared Understanding Loop (answer → thinking → memory → update animation)
3. **S17-3** Dynamic Question Engine (missing-field priority)
4. **S17-4** Final Confirmation before Analysis

---

## Architecture preference

Reuse existing Memory → Evidence → Loop → Shared Understanding spine. Prefer journey improvement over new screens/menus. No CartPilot. No feature grids / unrelated polish.

---

## Known Issues (honest)

| ID | Item | Notes |
|----|------|-------|
| K-1 | Client PDF text extraction still weak on some browsers | Trust remains honest; Document First shows partial draft + low confidence — empty form still forbidden |
| K-2 | S15 Playwright specs lag S16 confirm gate | Update in S17 Internal QA pass (was S16 D-1) |

---

## Progress

See `docs/sprints/S17_PROGRESS.md`.

---

## Gate suggestion

When P0 Acceptance is met: **Internal QA** → CTO report → CPO Review → (CEO Walkthrough reopen when CPO opens gate).
