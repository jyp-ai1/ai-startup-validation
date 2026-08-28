# ALABOM Long Sprint — QA Report

```text
Date: 2026-08-28 (KST)
Production baseline: 048b38eb4c3f0a4c89a48f13c5d54e559ce18c65
Post-fix capture: pending deploy of delta-visibility patch
Auth: Deferred / EXCLUDED from scenarios
Verdict: Internal QA pass on engine; LIVE re-capture pending new SHA
CPO PASS: NOT declared
```

## Internal QA

| Check | Result |
|-------|--------|
| `core-final-stabilization.test.ts` | **PASS** (25 tests across stabilization + v4) |
| `pnpm --filter web build` | **PASS** |
| Targeted unit (delta, causality, gate) | **PASS** |

## Production LIVE (baseline @ 048b38e)

Source: [long-sprint-final FINDINGS](../evidence/ALABOM/conversation-validation/long-sprint-final/FINDINGS.md)

| Scenario | ID | LIVE @ 048b38e |
|----------|-----|----------------|
| Demo document seed | A/B | PASS (thin doc + confirm) |
| Nonsense reject | D | PASS |
| Why repeat | E | PASS |
| Prior edit | F | PASS |
| Conflict / not-that | G | PASS |
| Competition → diff | H/I | PASS |
| Pricing / revenue | J | PASS |
| Mid judgment | K | PASS |
| Sufficiency vs analysis gate | L | PASS (`criticalGapBlockedStartAnalysis=true`) |
| Final analysis | M/N | PASS |
| 30+ turns | — | **33 turns** |
| New user /who one-liner | A | **NOT captured** (Demo doc only) |

## Hard metrics (honest — baseline @ 048b38e)

| Metric | LIVE @ 048b38e | Target | Post-fix expected |
|--------|----------------|--------|-------------------|
| Turns | 33 | ≥30 | ≥30 |
| same-meaning re-ask | 0 | 0 | 0 |
| wrong-slot | 0 | 0 | 0 |
| mixed-Q | 0 | 0 | 0 |
| closed gap re-ask | 0 | 0 | 0 |
| doc re-input | 0 | 0 | 0 |
| why→fact | 0 | 0 | 0 |
| edit supersede leak | 0 | 0 | 0 |
| hallucinated facts | 0 | 0 | 0 |
| whyNow present | ~100% | 100% | 100% |
| understandingDelta empty (mergeable) | **4** | 0 | **0** (UI fix) |
| 30+ natural journey | PASS | PASS | PASS |
| final result reached | PASS | PASS | PASS |

### Delta-empty root cause (fixed in code)

Empty captures occurred when:

1. Loop phase=`issue` with recognition dismissed — ask surface had no judgment/delta block.
2. Snap during `reanalyze` — processing UI had no `understanding-delta` testid.

## Journey evidence paths

| Journey | Transcript | Turns (slice) |
|---------|------------|---------------|
| New / Demo seed | [TRANSCRIPT-NEW.md](../evidence/ALABOM/long-sprint/TRANSCRIPT-NEW.md) | 2 |
| Document adaptive | [TRANSCRIPT-DOCUMENT.md](../evidence/ALABOM/long-sprint/TRANSCRIPT-DOCUMENT.md) | 4 |
| Why / nonsense | [TRANSCRIPT-WHY.md](../evidence/ALABOM/long-sprint/TRANSCRIPT-WHY.md) | 2 |
| Prior edit | [TRANSCRIPT-EDIT.md](../evidence/ALABOM/long-sprint/TRANSCRIPT-EDIT.md) | 1 |
| Conflict | [TRANSCRIPT-CONFLICT.md](../evidence/ALABOM/long-sprint/TRANSCRIPT-CONFLICT.md) | 2 |
| Competition / diff | [TRANSCRIPT-COMPETITION.md](../evidence/ALABOM/long-sprint/TRANSCRIPT-COMPETITION.md) | 22 |
| Validation / gate | [TRANSCRIPT-VALIDATION.md](../evidence/ALABOM/long-sprint/TRANSCRIPT-VALIDATION.md) | 5 |
| Final | [TRANSCRIPT-FINAL.md](../evidence/ALABOM/long-sprint/TRANSCRIPT-FINAL.md) | 2 |

Full index: [EVIDENCE_INDEX.md](../evidence/ALABOM/long-sprint/EVIDENCE_INDEX.md)

## Re-run command (after deploy)

```powershell
cd apps/web
$env:CI='1'
$env:PLAYWRIGHT_BASE_URL='https://ai-startup-validation-tau.vercel.app'
$env:ALABOM_REQUIRED_SHA='<new-sha-prefix>'
pnpm exec playwright test e2e/_cpo-long-sprint-final-prod-capture.spec.ts --retries=0
```

## UI/UX checklist

| # | Requirement | Status |
|---|-------------|--------|
| 15 | Wide textarea 0/1000 + placeholder | **done** |
| 16 | AI-generated project name on create | **done** (existing action) |
| 17 | AI PM understanding panel (not 10-field form) | **done** |
| 18 | Contextual review CTA + honest disable | **done** |
| 19 | Processing staged UX + delta | **done** (this sprint) |
