# TTAEJYO P0 — Question Quality / Natural Question Gate

**Date:** 2026-08-31  
**Status:** PASS  
**Scope:** User-facing ask text only (render/quality gate). No ranking, payer, FIX 3/4/5, persistence, or transition-lock semantics changed.

---

## PHASE 1 — RCA

### Trace path

```
decideNextQuestion (question-decision-engine.ts)
  → reframeQuestion (reframe-question.ts) when prior ask / same-meaning
  → whyThisQuestionNow (workspace-ai-pm-loop-panel.tsx useMemo)
  → displayQuestionText (resolveDisplayQuestionWithLock)
  → WorkspaceS11Surface (questionTextOverride)
```

### WHO generates leaked meta language

| String pattern | Source file | Function | Role |
|---|---|---|---|
| `현재 이해(` / `(현재 이해:` | `reframe-question.ts` | `contextualWhyNow`, `reframeQuestion` L166 | Internal reframe digest prepended to **questionText** when stem equals previous ask |
| `다시 묻습니다` | `reframe-question.ts` | `reframeQuestion` L166 | Same re-ask guard — prefixed to question candidate |
| `핵심 공백` | `gap-question-map.ts` | `GENERIC_GAP_QUESTION_TEXT` | Generic fallback when gap unmapped |
| `남은 핵심 공백` | `reframe-question.ts` | `contextualWhyNow` (mid_judgment) | whyNow only — but was leaking via combined surfaces |
| `이 답변으로는 확인` | `packages/i18n/.../ko.json` | IRRELEVANT feedback copy | Must not become primary ask |
| `현재 이해 —` | `build-conversation-understanding-summary.ts`, `living-understanding-state.ts` | judgment/summary builders | Internal context only |

**Root cause:** `reframeQuestion()` intentionally embeds understanding digest into **questionText** (not just whyNow) to force wording change vs prior identical ask. `resolveDisplayQuestionWithLock` treated any non-generic string as display-SoT, so meta-prefixed reframes reached `WorkspaceS11Surface`.

---

## PHASE 2 — Fix

New module: `question-quality-gate.ts`

- `hasQuestionMetaLanguage()` — FAIL patterns: 현재 이해(, 다시 묻습니다, 핵심 공백, 이 답변으로는 확인, 분석 결과를 기준으로, etc.
- `isNaturalUserFacingQuestion()` — valid = non-empty, not generic stub, no meta
- `gateUserFacingQuestion()` — valid candidate unchanged; invalid → `resolveGapQuestionBinding(targetGap).questionText`

Integrated in `question-transition-lock.ts` → `resolveDisplayQuestionWithLock` (minimal diff; no engine/ranking changes).

---

## Changed files

| File | Change |
|---|---|
| `apps/web/features/workflow-journey/lib/business-understanding/question-quality-gate.ts` | **NEW** — meta detection + canonical fallback |
| `apps/web/features/workflow-journey/lib/business-understanding/question-transition-lock.ts` | Gate candidates + final display through quality gate |
| `apps/web/features/workflow-journey/lib/business-understanding/__tests__/question-quality.test.ts` | **NEW** — 6 P0 cases |

---

## PHASE 3 — Tests

| Suite | Result |
|---|---|
| `question-quality.test.ts` | **6/6 PASS** |
| `question-transition-lock.test.ts` | **5/5 PASS** |
| `question-transition-persist-remount.test.ts` | **3/3 PASS** |
| `current-question-visibility.test.ts` | **4/4 PASS** |
| `ttaejyo-p0-hold.test.ts` | **10/10 PASS** |
| `ceo-second-loop-repro.test.ts` | (included in regression run) |
| `core-final-stabilization.test.ts` | **78/78 PASS** |

**Total regression: 106/106 PASS**

---

## Example — before / after

**Before (leaked):**
> 현재 이해(외국인 관광객… · 방한 외국인 · 클룩…)를 기준으로 다시 묻습니다 — 「차별점…」가 「방한 외국인」에게 구체적으로 어떤 가치를 만드나요?

**After (gated):**
> 그 차별점이 고객에게 왜 중요한가요?

(Contextual reframe stems without meta language still pass unchanged.)
