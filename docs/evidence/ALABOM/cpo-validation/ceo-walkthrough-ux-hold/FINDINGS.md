# CEO Walkthrough UX HOLD — Investigation & Fix

**Project:** 아라봄 (ALABOM)  
**Production baseline:** `294ac87` (persona fix deployed)  
**CPO verdict:** HOLD (UX presentation — not engine PASS)

---

## BEFORE (CPO symptoms)

| Priority | Symptom |
|----------|---------|
| P0 | **Question text not rendered** — user sees only textarea placeholder `예: B2B 월 구독, 건당 수수료 등` and `[답변 반영하기]`; no **지금 질문** label/content |
| P0 | User guessed answer from placeholder, submitted → **same screen repeated** (no visible next question) |
| P1 | **지금까지 AI가 이해한 내용** showed accumulated transcript sentences, not structured state |
| P1 | **상세 보기** exposed internal keys (`businessOneLiner`, `customerPersona`, …) |

---

## ROOT CAUSE (state chain break)

```
decideNextQuestion → gapQuestionText ✓
       ↓
presentThinking(memory) → fact already Confirmed → issueId: null
       ↓
presentThinkingSurface(mode:'ask') → if (!issueId) return base  ← BREAK (ignored gapQuestionText)
       ↓
presentS11Surface → question.text = '' 
       ↓
WorkspaceS11Surface → showQuestion = Boolean(text.trim()) → false → surface-question NOT in DOM
       ↓
textarea still renders with issues.bm_design.placeholder only
```

### Code references

1. **`build-thinking-presenter.ts`** — when target fact is `confirmed`, returns `question: { issueId: null }` (correct for Memory, breaks surface path).

2. **`build-thinking-surface-presenter.ts`** (before fix) — ask mode early-return when `!issueId`, **without** applying `gapQuestionText`.

3. **`build-s11-surface-presenter.ts`** (before fix) — update mode set `question: { text: '', purpose: '' }`, hiding next question after submit recognition.

4. **`workspace-s11-surface.tsx`** — conditional `showQuestion` hid entire `data-testid="surface-question"` block when presenter text empty, even though engine had a valid adaptive question.

5. **Submit → same screen** — partially UX (question invisible so user cannot tell if question changed) + update-mode empty question after answer processing.

---

## FIX (minimal, presentation-only)

| File | Change |
|------|--------|
| `build-thinking-surface-presenter.ts` | Use `gapQuestionText` when `issueId` is null; propagate next question in update mode |
| `build-s11-surface-presenter.ts` | Always prefer `gapQuestionText` for `question.text`; update mode shows next question |
| `workspace-s11-surface.tsx` | `questionTextOverride` prop; structured `understandingRows` from living state |
| `workspace-ai-pm-loop-panel.tsx` | `displayQuestionText` resolver (engine → surface → ref → issue template fallback) |
| `build-conversation-understanding-summary.ts` | Labeled summary rows + Korean judgment formatter |
| `workspace-ai-pm-conversation-detail.tsx` | Korean labels in detail panel |

**NOT changed:** gap ranking, adaptive engine, turn-count escape, reAsk manipulation.

---

## AFTER (expected UX)

```
프로젝트명
↓
지금 질문  ← always visible when textarea active (displayQuestionText)
↓
답변 textarea
↓
[답변 반영하기]
↓
▸ 왜 지금 이 질문인가요?
↓
▸ 지금까지 AI가 이해한 내용  ← 고객/문제/해결/수익/차별/수요 rows
↓
▸ 상세 보기  ← Korean labels only
```

---

## Tests

`apps/web/features/workflow-journey/lib/business-understanding/__tests__/ceo-walkthrough-ux-hold.test.ts`

- `presentThinkingSurface` uses `gapQuestionText` when `issueId` is null
- `presentS11Surface` non-empty question for 아라봄 adaptive path
- Korean judgment summary (no internal keys)
- Structured understanding rows

---

## CPO status

**HOLD remains** — CEO Walkthrough full journey not re-validated on Production after this fix. UX presentation P0 addressed locally; deploy + live capture required for PASS consideration.
