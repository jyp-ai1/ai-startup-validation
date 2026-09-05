# ALABOM — DAY 8-B AI PM UX POLICY DESIGN

**Status:** Policy design + P0 hotfix (Phase 1)  
**Base SHA:** `ea573cf112f6514b4bb45d8f19bb2a8b0b05b2b3`  
**Stage B:** HOLD until CPO policy approval

---

## 1. P0 Hotfix (Phase 1 — Implemented)

### P0-1 Answer Draft Persistence

| Item | Detail |
|------|--------|
| **Store** | `workspace-answer-draft-store.ts` — sessionStorage key `launchlens.aiPmAnswerDraft.{projectId}` |
| **Restore** | `useLayoutEffect` on projectId / snapshot hydrate |
| **Persist** | `updateAnswerDraft()` on textarea onChange |
| **Clear** | `resetAnswerDraft()` on successful submit paths |
| **Tests** | `day8b-p0-ux-hotfix.test.ts` |

### P0-2 CEO Engine Meta Filter

| Item | Detail |
|------|--------|
| **Filter** | `isEngineMetaCopy()` + extended `FORBIDDEN_UI_PATTERNS` in `build-ceo-six-surfaces.ts` |
| **Blocked** | `Prior turn CLOSED`, `Multi-fact utterance`, routing/meta rationale |
| **Fix** | gapState `rationale` no longer used as CEO confirmed-fact fallback |
| **Tests** | `day8b-p0-ux-hotfix.test.ts` — confirmed facts regression |

---

## 2. Current UX → Proposed UX

### Current

```text
┌─ S11 Question (large) ─────────────────┐
│  [textarea]                             │
│  [답변 반영하기]                         │
├─ CEO 6 Surfaces (post-answer) ──────────┤
│  ① 내 답변  ② AI 이해  ③ Confirmed (N) │
│  ④ Unresolved (M)  ⑤ Why Now  ⑥ Next Q │
├─ ▸ 지금까지 AI가 이해한 내용 (accordion)│
├─ ▸ 상세 보기 (judgment/delta)          │
└─────────────────────────────────────────┘
```

**Problems:** 10+ visible regions, turn accumulation, gap checklist feel, engine meta leak.

### Proposed (CPO wireframe)

```text
┌────────────────────────────────────┐
│ ALABOM AI PM                       │
│                                    │
│ 제가 이해한 사업                   │
│ ───────────────────────────────    │
│ {latest business understanding}    │
│                                    │
│ 현재 판단                          │
│ ───────────────────────────────    │
│ {single judgment line}             │
│                                    │
│ 지금 확인할 것                     │
│ ───────────────────────────────    │
│ {one concrete question}            │
│                                    │
│ [ 답변 입력                       ] │
└────────────────────────────────────┘
         [ 사업 전체 보기 ]  ← on demand
```

**Principle:** Data accumulates internally; UI shows **latest snapshot only**.

---

## 3. AI PM Interaction Model

### CEO Intent taxonomy (proposed)

| Intent | Example | Loop behavior |
|--------|---------|---------------|
| **ANSWER** | "CEO와 PM이 월 구독료를 냅니다" | Review → understand → next need |
| **CORRECT** | "아니요, 사장님이 대신 결제합니다" | Contradiction → clarify |
| **CHOOSE** | "A가 맞아요" / conflict resolution | Lock fact → advance |
| **RESEARCH** | "경쟁사 찾아줘" | **Bypass question engine** → AI action queue |
| **SUMMARIZE** | "지금까지 정리해줘" | Present latest understanding (no new ask) |
| **DECIDE** | "이대로 GO" | Stage transition / analysis gate |
| **ASK_AI** | "왜 이걸 물어봐?" | Meta explain (no fact merge) |
| **DELEGATE** | "시장조사 해줘" | Same as RESEARCH — not stock gap question |

**Detection (Phase 3):** extend `interpretAnswerSemantics` with intent classifier rules (no new LLM initially):

```text
/찾아|조사|검색|리서치|알아봐|조사해/
→ RESEARCH (if no factual answer embedded)
```

**Policy:** RESEARCH intent **must not** route to `alternativesCompetitors` stock question.

---

## 4. Question Policy

### Current (V3)

```text
CEO Answer
  → Review → gapVerdicts
  → gapState CLOSED?
  → pickNextRequiredGap / selectAdaptiveNextGaps
  → resolveGapQuestionBinding (stock template)
  → reframeQuestion (prefix only)
  → UI
```

**Decision driver:** Gap inventory completeness, not judgment uncertainty.

### Proposed (Product Policy Layer on V3)

```text
CEO Answer
  → Intent classify
  → Understanding update (Living claims — primary)
  → Judgment snapshot ("현재 판단")
  → Uncertainty scan (what would change judgment?)
  → Can AI resolve? (research / infer / summarize)
       YES → AI Action (no CEO question)
       NO  → Question Policy
              → Semantic cluster dedup (last 3 asks)
              → Pick 1 highest-impact uncertainty
              → Generate concrete behavioral question
  → UI (3-block snapshot)
```

**V3 engine remains SoT for gap state** — policy layer **reads** gapState/living but **does not** use gap ID as direct question selector.

### Bootstrap fix (P0 Product Architecture)

**Problem:** `pickBootstrapGap()` → first askable Stage A gap can be `marketChannel` if Stage A gaps pre-closed from document intake.

**Policy proposal:**

```text
Bootstrap question MUST come from:
  1. CEO document gap (highest uncertainty in living.claims)
  2. NOT first item in STAGE_A_REQUIRED_GAPS array
  3. Never Stage B before Stage A judgment exists
```

Implementation: **policy wrapper** around `decideNextQuestionFromReview` bootstrap path — not gapState rewrite.

---

## 5. Semantic Question Clusters

Clusters are **UX dedup units**, not gap replacements.

| Cluster | Meaning | Current gaps (internal) | CEO-facing theme |
|---------|---------|-------------------------|------------------|
| **C1 고객 문제** | Who hurts, how often, how bad | problemJtbd, problemFrequencySeverity, customerPersona | "누가 어떤 불편을 겪나요?" |
| **C2 경쟁/대안** | Alternatives landscape | alternativesCompetitors | "지금 뭘 쓰고 있나요?" |
| **C3 차별/선택** | Why us vs alternatives | differentiationVsAlternatives, validationTestability*, executionConstraints | "왜 바꿔야 하나요?" |
| **C4 가치/효과** | Customer outcome | solution, validationTestability* | "무엇이 달라지나요?" |
| **C5 검증/근거** | Evidence for demand | marketSizeEvidence, marketChannel | "근거가 있나요?" |
| **C6 수익/구매** | Who pays, how | payer, revenueModel, pricingHint | "돈은 어떻게 흐르나요?" |

\* `validationTestability` — **not independent CEO question** per CPO. Fold into C3/C4 cluster; internal gap may remain for readiness.

### Cluster dedup policy

```text
lastAskCluster = cluster(lastDecision.targetGapId)
if cluster(nextCandidate) === lastAskCluster:
  skip candidate, pick next highest-impact uncertainty in different cluster
if same cluster asked 2x in last 4 turns:
  force cluster rotation OR AI research action
```

---

## 6. Question Dedup Policy

| Layer | Current | Proposed |
|-------|---------|----------|
| String | `isSameMeaningQuestion()` | Keep + cluster check |
| Gap ID | `countUnclosedGapAsks` | Keep for probe limit |
| Semantic | None | **Cluster map** (above) |
| Impact | None | Skip if answer wouldn't change `judgment snapshot` |

**validationTestability stock question** (`그 차별점이 고객에게 왜 중요한가요?`) — **remove from CEO-facing policy**; replace with behavioral probe:

> "그 차별점이 실제로 드러나는 고객 경험 순간은 언제인가요?"

---

## 7. Research Delegation

### When CEO says "찾아줘 / 조사해줘"

```text
Intent = RESEARCH
  ↓
Policy: DO NOT call decideNextQuestionFromReview
  ↓
Enqueue AI Action:
  - type: research
  - domain: competitor | market | ...
  - context: living.claims + document
  ↓
(Phase 4+) Investigation engine / MCP
  ↓
Present results + single confirmation question:
  "이 중 실제 경쟁/대안으로 보이는 것은 무엇인가요?"
```

**Phase 3:** Design only — stub `AiPmAction` type, panel routing.  
**Phase 4:** Connect investigation engine (High risk — CPO deferred).

---

## 8. UI Wireframe (ASCII)

```text
┌──────────────────────────────────────────────────┐
│  AI PM                                    [DEMO] │
├──────────────────────────────────────────────────┤
│                                                  │
│  📋 제가 이해한 사업                              │
│  ┌────────────────────────────────────────────┐  │
│  │ B2B SaaS — 스타트업 CEO/PM 전략 검토 자동화  │  │
│  │ 대상: 10~50인 스타트업 팀                    │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  🎯 현재 판단                                     │
│  ┌────────────────────────────────────────────┐  │
│  │ Notion/Jira 대비 AI PM 맥락 기억이 핵심 후보 │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ❓ 지금 확인할 것                                │
│  ┌────────────────────────────────────────────┐  │
│  │ 사장님들이 주문·배송 관리에서 가장 번거로운   │  │
│  │ 순간은 언제인가요?                           │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ 답변을 입력하세요…                          │  │
│  └────────────────────────────────────────────┘  │
│                              [ 답변하기 ]        │
│                                                  │
│            [ ▸ 사업 전체 보기 ]                   │
└──────────────────────────────────────────────────┘
```

**Implementation path:** New `WorkspaceAiPmFocusedSurface` component — wraps existing data sources, does not delete V3 artifacts.

---

## 9. V3 Compatibility

### Maintain (frozen)

- `buildAnswerReview` / `gapVerdicts` / `updateGapStateFromReview`
- `decideNextQuestionFromReview` (no rewrite)
- `evaluateStageReadiness` / Stage A/B gates
- Session persistence (`gapState`, `lastDecision`, `lockedAskSurface`)
- E2E 6/6 regression suite

### Change via Policy Layer (new package/module)

| Layer | Location (proposed) | Role |
|-------|---------------------|------|
| `AiPmIntentClassifier` | `ai-pm-intent-policy.ts` | ANSWER/RESEARCH/... |
| `AiPmJudgmentSnapshot` | `ai-pm-judgment-presenter.ts` | "현재 판단" copy |
| `AiPmQuestionPolicy` | `ai-pm-question-policy.ts` | cluster dedup, bootstrap fix |
| `AiPmFocusedSurface` | `workspace-ai-pm-focused-surface.tsx` | 3-block UI |

Policy layer **consumes** V3 outputs; **does not mutate** gapState semantics.

### Not approved (CPO explicit)

- gapState structure change
- CLOSED criteria relaxation
- validationTestability gap deletion
- Research engine immediate integration
- V3 engine rewrite

---

## 10. Regression Plan

| Area | Tests |
|------|-------|
| P0 draft | `day8b-p0-ux-hotfix.test.ts` — persist/restore/clear |
| P0 meta | `day8b-p0-ux-hotfix.test.ts` — no engine leak in CEO surfaces |
| V3 chain | `ai-pm-loop-v3.test.ts` (72) |
| DAY 7 | `day7-p0-fixes.test.ts` (6) |
| E2E | `v3-p0-production-readiness.spec.ts` 6/6 after each phase |
| New (Phase 2+) | Focused surface snapshot tests, cluster dedup unit tests |

---

## 11. Production Plan

| Phase | Scope | Deploy |
|-------|-------|--------|
| **8-B-1** | P0 draft + meta filter | Immediate (this PR) |
| **8-B-2** | Focused UI prototype (feature flag) | After CPO wireframe approval |
| **8-B-3** | Intent + Question Policy module | After policy sign-off |
| **8-B-4** | Research delegation stub | Design → implement separately |
| **9+** | Investigation engine connect | High-risk gate |

---

## 12. Recommendation

### Immediate (approved)

1. ✅ Ship P0-1 draft persistence  
2. ✅ Ship P0-2 engine meta filter  

### Next (await CPO)

3. Approve **Focused 3-block UI** wireframe → implement behind `NEXT_PUBLIC_AI_PM_FOCUSED_UI`  
4. Approve **Intent taxonomy** → implement rule-based classifier  
5. Approve **Cluster dedup policy** → wrap `decideNextQuestionFromReview` output (not engine rewrite)  
6. Approve **Bootstrap policy** → fix first-question = marketChannel architecture issue  
7. Defer **Research engine** until 3–6 stable  

### Strategic shift

```text
FROM: Gap CLOSED checklist → stock question
TO:   Judgment uncertainty → AI action OR one concrete question
```

V3 remains the **memory and readiness engine**. The **Product Policy Layer** becomes the **CEO experience brain**.

---

**DAY 8-B Phase 1:** COMPLETE (code)  
**DAY 8-B Phase 2–4:** DESIGN ONLY — awaiting CPO approval  
**Stage B development:** HOLD
