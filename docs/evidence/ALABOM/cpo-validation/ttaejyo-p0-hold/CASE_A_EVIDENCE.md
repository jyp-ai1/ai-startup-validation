# TTAEJYO — CASE A Evidence (Answer Surface Missing)

**Environment:** New Workspace · Demo AI SaaS (`/workspace?demo=guided&sample=saas&fresh=1`)  
**Production probed:** `44f6940` @ 2026-08-30 (requested `2c551a3` — not deployed at probe time)  
**Question:** `경쟁 대비 이 서비스만의 차별점은 무엇인가요?` (`differentiationVsAlternatives`)  
**Symptom:** Question visible · no `<textarea>` · CTA only `같이 확인하기`

---

## Causal chain (BEFORE)

| Step | State | Result |
|------|-------|--------|
| 1 | User submits prior answer (often `bm_design` / payer) | `submitAnswer` → `setRecognitionDismissed(false)` |
| 2 | `finishProcessing` → `applyLoopProcessingTransition` | `phase: 'issue'`, `currentIssueId: competitor_analysis` |
| 3 | `lastTurn.issueId` = `bm_design`, `activeIssueId` = `competitor_analysis` | `showContinuousThinking = true` |
| 4 | `showRecognition = phase==='issue' && showContinuousThinking && !recognitionDismissed` | **TRUE** |
| 5 | Render branch `displayPhase === 'issue' && showRecognition` | Question + `같이 확인하기` only — **no textarea** |
| 6 | User cannot answer without discovering hidden recognition gate | Chain break: answer surface FAIL |

### Same-issue note (Demo AI SaaS path)

When prior turn is also `competitor_analysis` (competitor → differentiation), `showRecognition` is **false** and textarea renders. CASE A reproduces when the **prior answered issue differs** from the next gap's issueId (common on short SaaS seed: payer/revenue before competition/diff).

### Code anchors

- Recognition gate: `workspace-ai-pm-loop-panel.tsx` — `showRecognition`, lines ~521–525
- Recognition UI (no textarea): lines ~1832–1866
- Answer surface (textarea): `displayPhase === 'answer'` ~1624+, or `issue` non-recognition ~1868+
- Submit sets recognition: `setRecognitionDismissed(false)` ~1380

---

## Root cause

**Independent UX gate — not engine / ranking / semantic failure.**

The **recognition / update interstitial** intentionally hides the answer surface between cross-issue transitions. Adaptive gap question text renders via `gapQuestionText` + `displayQuestionText`, but the panel is in **`mode: update` presentation** with only `sharedThinking.continueCta` (`같이 확인하기`). CEO walkthrough treats this as “broken” because the primary action looks like the only path forward, not a gate to the answer box.

---

## Fix (minimal, local)

| File | Change |
|------|--------|
| `workspace-ai-pm-loop-panel.tsx` | After `finishProcessing`, when `phase === 'issue'` and next issue ready → auto `phase: 'answer'` + `setRecognitionDismissed(true)` (skip interstitial) |
| `workspace-ai-pm-loop-panel.tsx` | `useLayoutEffect` on `projectId`: reload loop + `recognitionDismissed(true)` on entry |

**NOT changed:** gap ranking, question wording, forced submit via continue CTA, competitor/diff semantics.

---

## AFTER (expected)

```
submit prior answer
  → finishProcessing
  → phase: 'answer' (not 'issue')
  → textarea + submit-answer-cta visible
  → differentiation question answerable immediately
```

---

## Tests

- `ttaejyo-p0-hold.test.ts` — cross-issue vs same-issue recognition gate conditions
- `ceo-walkthrough-ux-hold.test.ts` — gapQuestionText presenter path (unchanged, PASS)

---

## Production capture status

Playwright capture spec: `apps/web/e2e/_ttaejyo-p0-hold-capture.spec.ts`  
Live run blocked on UI selector drift (`AI SaaS` sample picker) — code trace + unit gates used as primary evidence.
