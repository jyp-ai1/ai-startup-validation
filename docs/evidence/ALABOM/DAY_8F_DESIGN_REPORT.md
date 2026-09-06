# ALABOM — DAY 8-F Question Causality & Answer Binding Design

**Date:** 2026-09-06  
**Gate:** DAY 8-E HOLD → Design before code  
**Production frozen:** DAY 8-D @ `ea566ac`  
**Prior observation:** [DAY_8E_CEO_JOURNEY_OBSERVATION_REPORT.md](./DAY_8E_CEO_JOURNEY_OBSERVATION_REPORT.md)

> **This document is design + root cause analysis only. No implementation until CPO approval.**

---

## 1. Problem Statement

Current pipeline:

```text
CEO Answer → Understanding → Memory/Claim/Spine → Gap → No-Ask → Question
```

**Memory participates too early and wins over the latest answer.**  
Question generation binds to **artifact availability**, not **answer causality**.

Desired pipeline:

```text
CEO Answer
 ↓
① Answer Intent
 ↓
② Answer Meaning (semantic interpretation)
 ↓
③ What changed? (understanding delta)
 ↓
④ Current Understanding
 ↓
⑤ Current Judgment
 ↓
⑥ What is genuinely uncertain?
 ↓
⑦ Can AI resolve it? (Research / inference)
 ↓
⑧ Confirm OR Ask OR Act
 ↓
Memory = reference only (never question owner)
```

---

## 2. Full Trace Map (Code Paths)

```text
workspace-ai-pm-loop-panel.tsx
  submitAnswer()
    → interpretAnswerSemantics()          [interpret-answer-semantics.ts]
    → classifyAiPmCeoIntent()             [ai-pm-intent-policy.ts]
    → applyWorkspaceLoopAnswer()          [process-loop-answer.ts]
    → buildAnswerReview()                 [build-answer-review.ts]
    → resolveNextQuestionDecision()       [resolve-next-question-decision.ts]
        → decideNextQuestionFromReview()  [decide-next-question-from-review.ts]
        → applyQuestionPolicy()           [ai-pm-question-policy.ts]
        → applyNoAskPolicy()              [ai-pm-no-ask-policy.ts]
    → buildAiPmFocusedSnapshot()          [ai-pm-focused-presenter.ts]
    → WorkspaceAiPmFocusedSurface         [workspace-ai-pm-focused-surface.tsx]
```

**Binding tables:**

| Module | Role |
|--------|------|
| `gap-question-map.ts` | gapId → questionText, factKey, issueId |
| `ai-pm-answer-first-routing.ts` | factKey ↔ gapId routing |
| `build-conversation-memory.ts` | turns → memory facts (document vs user_turn) |
| `ai-pm-no-ask-policy.ts` | semantic scan → CONFIRM / MOVE / ASK |

---

## 3. Root Cause Analysis — Six Failures

### Failure 1: 제공 가치 → 회사명 (P0-1 Answer Target Binding)

| Step | What happens |
|------|--------------|
| Gap selected | `solution` (제공 가치 question) |
| Binding | `gap-question-map.ts` L105–108: `solution.factKey = 'business'` |
| No-Ask scan | `scanSemanticKnowledgeForGap('solution')` → looks up `business` fact |
| Memory hit | `memory_document` = company name from uploaded doc / entities (`취향저격컴퍼니`) |
| Scan order | memory (L196) **before** prior_turn (L238) |
| CONFIRM | `buildConfirmText('solution', memory.value)` → wrong value, right label |

**Contradiction in codebase:**

- `build-conversation-memory.ts` L240–242: `gapToFactKey('solution')` returns **`null`** (solution must NOT use business memory)
- `gap-question-map.ts`: `solution.factKey = 'business'` (No-Ask **does** use business memory)

**Root cause:** **factKey collision** — `business` means both "one-liner/company" and "solution value prop". No-Ask prefers stale document memory over latest turn semantics.

**Not a fix:** Hide company name in confirm text. **Fix:** Bind confirm value to **latest turn semantic value for target gap**, with memory as fallback only when no turn exists.

---

### Failure 2: `(semantic repeat — memory_document)` CEO leak

| Step | What happens |
|------|--------------|
| No-Ask CONFIRM | `evaluateNoAskPolicy` → `reason: 'semantic repeat — memory_document'` |
| applyNoAskPolicy | `whyNow: '... (${verdict.reason})'` — L468 |
| Focused UI | `buildConfirmPrompt(whyNow)` → `confirmPrompt` block |
| Sanitize | `INTERNAL_KEY_RE` in `ai-pm-judgment-presenter.ts` — **does not include** `semantic repeat`, `memory_document`, `no-ask` |

**Root cause:** Engine diagnostics written into CEO-facing `whyNow`. Sanitizer incomplete.

**Design rule:** Internal reasons live in `actionRationale` / logs only. CEO copy uses fixed templates.

---

### Failure 3: 사업 한 줄 → 회사명 (same as Failure 1)

Same `business` factKey collision. `businessOneLiner` gap + document memory → confirm company name instead of CEO's one-liner answer.

**Additional path:** `safeBusinessFromEntities()` in `build-conversation-memory.ts` seeds `business` from `entities.business.name`.

---

### Failure 4: 차별점 → 「B 가 네 맞습니다.」 (P0-2 cascade)

| Step | What happens |
|------|--------------|
| Prior turn | CEO typed "네 맞습니다" into **text input** (no Yes button) |
| Interpret | Stored as business_fact / differentiation answer |
| No-Ask | `scanSemanticKnowledgeForGap('differentiationVsAlternatives')` finds prior_turn value |
| CONFIRM | `buildConfirmText` clips "B 가 네 맞습니다." |

**Root cause chain:**

1. CONFIRM questions use OPEN UX (textarea) — P0-2
2. Meta-confirm responses enter fact DB as real answers
3. Next CONFIRM reuses corrupted prior_turn value

---

### Failure 5: 이전 답변 수정 → 과거 memory (P0-3)

| Step | What happens |
|------|--------------|
| UI | `editableTurns` in `workspace-ai-pm-loop-panel.tsx` L1997–2014 |
| Logic | Iterates all turns; **dedupes by issueId** (first turn per issue wins) |
| Display | Lists by `t(\`issues.${turn.issueId}.riskLabel\`)` — not chronological "last" |
| CEO expect | Edit **immediate prior answer** that triggered current confirm |

**Root cause:** "Previous" = first turn per issue bucket, not `turns[turns.length - 1]` or confirm-bound turn.

**Design:** When `questionType === 'confirm'`, "수정" binds to `lastTurn.answer` + `lastTurn.targetGap`. Historical edit = separate "대화 기록 수정" entry.

---

### Failure 6: 확인해주세요 → Research 아님 (P0-4)

| Step | What happens |
|------|--------------|
| Input | `잘모릅니다. 확인해주세요` / `알아보고 안내해주세요` |
| Router | `classifyAiPmCeoIntent()` — `RESEARCH_RE` L25–26 |
| Match | **FAIL** — patterns require `찾아줘`, `조사해`, `알아봐` (not `알아보고`, `확인해`) |
| Route | `ANSWER` → loop continues → confirm/gap question |

**Root cause:** Research intent regex too narrow; "I don't know, please check" is semantically RESEARCH delegation.

**Design:** Expand intent classifier with **delegation cues** (모르겠|모릅니다|확인해\s*줘|알아보|안내해\s*줘) when combined with research domain (경쟁|시장|대안).

**Scope guard:** Still no Research Engine — acknowledgement + STOP only (Phase D pattern).

---

## 4. P0 Design Proposals

### P0-1 — Answer Target Binding

**Rule:** Question/confirm value MUST bind to:

```text
priority:
  1. latestTurn.semanticValue for targetGap
  2. living.claim for targetGap (if from same turn or USER_CONFIRMED)
  3. prior_turn (same gap cluster, last 1 turn)
  4. memory_user_turn (never memory_document for confirm)
  5. memory_document / spine — READ ONLY for Understanding display, NOT for confirm ask
```

**Schema change (minimal):**

- Add `solution` to `ConversationFactKey` OR split `business` → `businessOneLiner` | `valueProposition`
- Update `gap-question-map`: `solution.factKey = 'solution'` (or `valueProposition`)
- Align `build-conversation-memory` + `scanSemanticKnowledgeForGap` scan order

**Files touched (implementation phase):**

- `gap-question-map.ts`
- `conversation-memory.ts` (type)
- `ai-pm-no-ask-policy.ts` (scan priority)
- `living-understanding-state.ts` (solution claim)

---

### P0-2 — Confirm vs Open Question Type

**New field on decision:**

```typescript
questionType: 'open' | 'confirm';
confirmBinding?: { gapId: string; proposedValue: string; sourceTurnId?: string };
```

**UI (`workspace-ai-pm-loop-panel.tsx`):**

| Type | CEO action |
|------|------------|
| `confirm` | `[네, 맞습니다]` `[아니요, 수정할게요]` — hide textarea default |
| `open` | Textarea + submit |

**On confirm Yes:** close gap presentationally, advance without storing "네 맞습니다" as fact value.

**Files:** `decide-next-question-from-review.ts` types, loop panel, focused surface optional CTA row.

---

### P0-3 — Previous Answer Edit Binding

**Rules:**

1. Default "← 이previous 답변 수정" → **last non-superseded turn** only (single target)
2. When confirm active → edit `confirmBinding.sourceTurnId` answer
3. Multi-turn history edit → separate "대화 기록" panel (not default CTA)

**Files:** `workspace-ai-pm-loop-panel.tsx` (`editableTurns` logic)

---

### P0-4 — Research Request Continuity

**Expand `RESEARCH_RE` + semantic delegation detector:**

```text
(delegation_cue) AND (research_domain_cue)
  delegation: 모르겠|모릅니다|확인해|알아보|조사|찾아|안내해
  domain: 경쟁|대안|시장|비슷한\s*서비스
```

**Also:** Run `classifyAiPmCeoIntent` **before** no-ask confirm generation on competitor gaps when answer is delegation.

**Files:** `ai-pm-intent-policy.ts`, loop panel submit order (already early for explicit RESEARCH).

---

## 5. Question Causality Contract (New)

Every ask MUST carry:

| Field | CEO-visible | Purpose |
|-------|-------------|---------|
| `causedByTurnId` | No | Which answer triggered this ask |
| `causedByFactKey` | No | Semantic domain of cause |
| `questionType` | Yes (via UI) | confirm vs open |
| `whyNow` | Yes | CEO language only — template-based |
| `proposedValue` | Yes (confirm only) | From causedBy turn, not memory_document |

**Forbidden in CEO copy:** `semantic repeat`, `memory_document`, `no-ask`, `gapId`, `targetGap`, `MOVE`, `CONFIRM` action codes.

Extend `sanitizeCeoFacingCopy` OR separate `sanitizeCeoWhyNow()` with denylist.

---

## 6. Contradiction Compare UX (Preserve + Fix Binding)

**Keep** "이previous 확인 / 새 답변" pattern when:

- `prior` = last confirmed value for **same gap**
- `next` = latest CEO utterance for **same gap**

**Reject** when prior pulled from unrelated memory_document.

**File:** contradiction resolution in loop panel + `build-answer-review.ts` contradiction builder.

---

## 7. Implementation Phases (Post-CPO Approval)

| Phase | Scope | Risk |
|-------|-------|------|
| F-1 | P0-1 scan priority + factKey split | Medium — touches memory types |
| F-2 | P0-2 confirm UI + questionType | Low — presentation + loop panel |
| F-3 | P0-3 edit binding | Low — UI only |
| F-4 | P0-4 research phrases | Low — intent regex |
| F-5 | Meta sanitization + causality contract | Low |

**Regression gates:**

- DAY 8-D A→D unit 124/124 must not break
- New F-1–F-4 unit tests per P0
- CEO Journey re-run on Production

**HOLD:** Research Engine, Stage B, V3 core rewrite, gapState SoT redesign

---

## 8. Test Scenarios (Design Acceptance)

| ID | Scenario | Expected |
|----|----------|----------|
| F-1 | Value prop answer on solution gap | Confirm 「온라인 홍보…」, NOT company name |
| F-2 | Confirm question visible | Yes/No buttons; no forced textarea |
| F-3 | Click "이previous 답변 수정" after answer | Opens **last turn** editor |
| F-4 | "경쟁사 모르겠어 확인해줘" | RESEARCH ack + question STOP |
| F-5 | No `(semantic repeat — …)` in Focused UI | PASS |
| F-6 | "네 맞습니다" typed on confirm | Must not become next confirm value |

---

## 9. CPO Alignment

| CPO P0 | Design section |
|--------|----------------|
| P0-1 Answer Target Binding | §4 P0-1, Failure 1/3 |
| P0-2 Confirm / Open | §4 P0-2, Failure 4 |
| P0-3 Previous Edit Binding | §4 P0-3, Failure 5 |
| P0-4 Research Continuity | §4 P0-4, Failure 6 |

**DAY 8-D remains frozen.** DAY 8-F changes are **additive policy + presentation fixes** on top of frozen V3 SoT.

---

Next Autonomous Target  
Epic DAY 8-F / CPO design review / Implementation HOLD until approval / 다음 보고 08:00

AI는 Founder의 성공 확률을 높이기 위한 다음 개선을 계속 진행 중입니다.
