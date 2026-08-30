# CEO Walkthrough — Customer Question Infinite Loop

**Status:** ROOT CAUSE PROVEN · FIX DEPLOYED · **Production harness PASS @ `294ac87`** · **CEO Walkthrough HOLD** (awaiting CPO re-judgment)

**Production baseline (pre-fix):** engine `4755e27`, UX `8a88df7`  
**Production fix deploy:** `294ac87bea13ec19dfe198dc22946eb21f2e9fbd` @ 2026-08-30T12:40:21Z  
**Fix scope:** `persona-answer-cues.ts` + semantic routing (no UX/spine/ranking overhaul)

---

## Problem statement

CEO free-form walkthrough: **「이 서비스를 가장 필요로 하는 구체 고객은 누구인가요?」** repeats after the user gives a substantive persona answer.

Automated harness @ `4755e27` reported **reAsk=0** because harness uses BANK strings with explicit segment keywords (`FIT`, `MZ`, `초기 타깃`, …). CEO natural Korean answers omit those tokens.

---

## Phase 1 — BEFORE (reproduce + prove)

### Evidence sources searched

| Source | Result |
|--------|--------|
| Agent transcripts | No captured CEO verbatim answers; loop reported from live walkthrough |
| `real-adaptive/transcript-raw.json` | Persona Q repeats T5–T7 on **meta** answers (nonsense/why/mid-summary), not CEO persona |
| `real-adaptive-vnext/transcript-raw.json` | Harness BANK.persona closes gap @ T14; P0-1 wrong-slot path proven |

### CEO-style answers constructed (NOT BANK)

Natural Korean persona descriptions without harness keywords:

```
30대 직장인 커플이요. 서울 처음 와서 로컬 맛집 찾기 어려워하는 분들
예약 전에 맞춤 일정을 원하는 방한 외국인
동선 낭비 없이 여행하고 싶은 외국인
차별점을 예약 전에 체감하고 싶은 사람
… (16 total — see ceo-persona-loop-repro.test.ts)
```

### Unit reproduction @ `4755e27` logic (pre-fix)

**3/16 CEO answers failed gap closure** — all misrouted to `diffRelevance` instead of `customer`:

| User answer | semanticFactKey | customerPersona closed? |
|-------------|-----------------|-------------------------|
| 예약 전에 맞춤 일정을 원하는 방한 외국인 | `diffRelevance` | **NO** |
| 동선 낭비 없이 여행하고 싶은 외국인 | `diffRelevance` | **NO** |
| 차별점을 예약 전에 체감하고 싶은 사람 | `diffRelevance` | **NO** |

### Failure trace (canonical path)

```
CEO free-form answer on customerPersona ask
  → interpretAnswerSemantics()
  → isRelevanceDominantOnPersonaAsk() == true
     (hasDiffRelevanceEvidence: "예약 전" / "낭비" / "체감")
     AND personaSegmentCue == false (외국인·사람·30대 not in narrow BANK regex)
  → semanticFactKey = diffRelevance  ✗ NOT customer
  → Memory: customer fact NOT stored (or wrong slot)
  → getAnsweredTargetGaps(): customerPersona NOT in answered set
  → listUnconfirmedCriticalGaps(): customerPersona still open (doc "방한 외국인" = AI_INFERENCE)
  → resolveMissingFieldPriorities() re-ranks customerPersona
  → Same stock question reframed → INFINITE LOOP from CEO perspective
```

### Repeat-turn state (pre-fix, failing answer)

| Field | Value |
|-------|-------|
| question surface | `이 서비스를 가장 필요로 하는 구체 고객은 누구인가요?` |
| selected gap | `customerPersona` |
| critical gaps | includes `customerPersona` (not USER_CONFIRMED) |
| wrongSlotPending | null (unless prior wrong-slot path) |
| lastAskSurface | customerPersona stock/reframe |
| semanticFactKey | **`diffRelevance`** (wrong) |
| understandingDelta | unchanged — customer still doc-inferred |
| gap closed? | **NO** |

---

## Phase 2 — ROOT CAUSE

**Classification failure, not reAsk-ban failure.**

When `askedGap === 'customerPersona'`, answers that co-mention **relevance surface words** (`예약 전`, `체감`, `동선`, `낭비`) were treated as **validationTestability / diffRelevance** answers even when the utterance clearly describes **WHO** (외국인, 사람, 30대, …).

The persona segment regex was tuned for **harness BANK strings** (`FIT`, `MZ`, `초기 타깃`) and missed **CEO natural language**.

P0-1 wrong-slot path (pure BANK diffRelevance without WHO) must remain intact.

---

## Phase 3 — FIX (minimal)

**New:** `apps/web/features/workflow-journey/lib/business-understanding/persona-answer-cues.ts`

- Expanded `PERSONA_SEGMENT_CUE_RE` (외국인, 커플, 20–50대, 사람, 직장인, …)
- `isRelevanceDominantOnPersonaAsk()` — relevance steal **only** when no WHO cues
- Weak prior on `customerPersona` ask: substantive free-form → `customer` when not competitor/diff-only

**Updated:**

- `interpret-answer-semantics.ts` — customerPersona block uses shared cues + weak prior
- `wrong-slot-priority.ts` — unified persona/relevance detection (P0-1 preserved)
- `workspace-ai-pm-loop-panel.tsx` — display SoT canonicalization aligned

**Tests:**

- `ceo-persona-loop-repro.test.ts` — 16 CEO-style answers
- `core-final-stabilization.test.ts` — explicit CEO regression case

---

## Phase 4 — AFTER (local verification)

### CEO answers — post-fix

| Metric | Result |
|--------|--------|
| CEO-style answers closing customerPersona | **16/16 PASS** |
| Exact CEO failure case | `예약 전에 맞춤 일정을 원하는 방한 외국인` → `customer` ✓ |
| core-final-stabilization | **78/78 PASS** |
| P0-1 wrong-slot BANK diffRelevance | **PASS** (unchanged) |

### Turn sequence AFTER (same CEO answer)

| Turn | User | semanticFactKey | customerPersona closed? | Next gap |
|------|------|-----------------|-------------------------|----------|
| Tn | 예약 전에 맞춤 일정을 원하는 방한 외국인 | `customer` | **YES** | ranked next (e.g. problemJtbd) |

### Production re-verify (@ `294ac87`)

**Deploy SHA:** `294ac87bea13ec19dfe198dc22946eb21f2e9fbd` (poll `/api/build-info` @ 2026-08-30T12:40:21Z)

**Local verify (2026-08-30):** `ceo-persona-loop-repro` + `core-final-stabilization` — **79/79 PASS**

**Production harness (2026-08-30 @ `294ac87`):**

```powershell
cd apps/web
$env:CI='1'
$env:PLAYWRIGHT_BASE_URL='https://ai-startup-validation-tau.vercel.app'
pnpm exec playwright test e2e/_cpo-ceo-persona-loop-prod-capture.spec.ts --retries=0
```

| Metric | Result |
|--------|--------|
| Harness | **PASS** (1.4m) |
| CEO input #1 | `예약 전에 맞춤 일정을 원하는 방한 외국인` |
| customerPersona closed? | **YES** (after 1st CEO answer) |
| Next gap | **problemJtbd** |
| Persona repeats | **0** |
| Verdict | `PASS — CEO persona answer closed gap; next question is not persona repeat` |

**Production turn sequence (CEO path):**

| Turn | User | Next question | Gap closed? |
|------|------|---------------|-------------|
| T6 persona-ask | (awaiting) | 이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요? | — |
| T7 ceo-persona-1 | 예약 전에 맞춤 일정을 원하는 방한 외국인 | 지금 가장 크게 해결하려는 불편은 무엇인가요? | **YES** → problemJtbd |

Output: `docs/evidence/ALABOM/cpo-validation/ceo-walkthrough-loop/transcript-raw.json`

Harness regression: existing @ `4755e27` evidence **reAsk=0**; no harness padding added.

---

## CPO verdict

**CEO Walkthrough: HOLD** — Production harness PASS @ `294ac87`; submitted for CPO re-judgment (not CTO-declared PASS).

**CPO PASS: NOT declared.**

See [CPO_SUBMISSION.md](./CPO_SUBMISSION.md) for copy-paste block.

---

## Files

| Path | Role |
|------|------|
| `INFINITE_LOOP_EVIDENCE.md` | This document |
| `../../real-adaptive/transcript-raw.json` | Harness meta-loop reference |
| `../../real-adaptive-vnext/CPO_SUBMISSION.md` | Harness reAsk=0 baseline |
| `apps/web/.../persona-answer-cues.ts` | Fix |
| `apps/web/.../__tests__/ceo-persona-loop-repro.test.ts` | CEO answer matrix |
| `apps/web/e2e/_cpo-ceo-persona-loop-prod-capture.spec.ts` | Production CEO-input re-verify |
