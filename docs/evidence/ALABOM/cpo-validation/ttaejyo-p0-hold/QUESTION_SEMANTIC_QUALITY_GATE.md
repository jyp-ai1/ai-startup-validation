# TTAEJYO P0 — Question Semantic Quality / User-Facing Ask Gate

**Date:** 2026-08-31  
**Status:** PASS  
**Scope:** User-facing ask semantic validation only (render/quality gate). No ranking, payer, persistence, or transition-lock semantics changed.

---

## Problem

Phase 1 meta gate blocked internal language (`현재 이해(`, `다시 묻습니다`, `핵심 공백`) but compound / non-answerable candidates could still pass:

```text
현재 이해(...)를 기준으로 다시 묻습니다 —
아직 확인이 필요한 핵심 공백이 있습니다. 알려 주세요.
```

**Root cause:** `isNaturalUserFacingQuestion()` only checked non-empty + not generic + no meta. It did not verify answerability, single ask, or meta+imperative combos.

---

## Fix — extended `question-quality-gate.ts`

| Rule | Function | FAIL signal |
|---|---|---|
| Meta / reasoning leakage | `hasQuestionMetaLanguage()` | 현재 이해, 다시 묻습니다, 핵심 공백, 분석/검토/판단 결과, 아직 확인, 기준으로 다시 |
| Meta prefix + bare imperative | `hasMetaPrefixWithGenericImperative()` | meta context + 알려/설명/확인/말씀 주세요 (except valid "X 알려 주세요") |
| Answerability | `lacksClearAnswerTarget()` | bare "알려 주세요", no interrogative target, vague "다시 말씀해 주세요" |
| Single ask | `isCompoundAsk()` | multiple `?`, comma-chained gap demands, 누구+왜+비용+경쟁 combo |
| Fallback | `gateUserFacingQuestion()` | invalid → `resolveGapQuestionBinding(targetGap).questionText` |

**Contract:** FAIL never rewrites with LLM or truncation — always canonical gap question by `targetGap`.

---

## P0 fixture

**BAD candidate (fixed in tests):**

```text
현재 이해(우리의 타켓이 온라인 커머스 전문도 아니고, …)를 기준으로 다시 묻습니다 —
아직 확인이 필요한 핵심 공백이 있습니다. 알려 주세요.
```

**Expected (binding-driven, not hardcoded one string):**

| targetGap | canonical |
|---|---|
| `payer` | 서비스 비용은 누가 지불하나요? |
| `customerPersona` | 이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요? |
| `differentiationVsAlternatives` | 경쟁 대비 이 서비스만의 차별점은 무엇인가요? |

---

## Tests

| Suite | Result |
|---|---|
| `question-semantic-quality.test.ts` | **11/11 PASS** (10 semantic + 1 render-path integration) |
| `question-quality.test.ts` | **6/6 PASS** |
| `question-transition-lock.test.ts` | **5/5 PASS** |
| `question-transition-persist-remount.test.ts` | **3/3 PASS** |
| `current-question-visibility.test.ts` | **4/4 PASS** |
| `ttaejyo-p0-hold.test.ts` | **10/10 PASS** |
| `ceo-second-loop-repro.test.ts` | **10/10 PASS** |
| `core-final-stabilization.test.ts` | **78/78 PASS** |

**Total regression: 127/127 PASS**

---

## Integration path verified

```text
resolveDisplayQuestionWithLock(fromEngine/surface/ref = BAD)
  → firstVisibleQuestion skips invalid candidates
  → gateUserFacingQuestion
  → canonical payer question
  → display contains no "현재 이해" substring
```

---

## Changed files

| File | Change |
|---|---|
| `question-quality-gate.ts` | Semantic checks: answerability, single ask, meta+imperative, extended leakage |
| `__tests__/question-semantic-quality.test.ts` | **NEW** — 11 P0 cases + render integration |

**Not changed:** `decideNextQuestion`, ranking, payer, persistence, transition-lock semantics, FIX 3/4/5.
