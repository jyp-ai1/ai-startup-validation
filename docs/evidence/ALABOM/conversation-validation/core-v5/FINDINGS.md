# ALABOM Core Conversation Engine v5 — FINDINGS (Production Demo)

```text
Date: 2026-08-27 (KST)
Engine fix: 8b30c51 (Core v5 Living Understanding)
Pin commit: ffd500c72649742627421e2f598f6208d3d65db8
Gate tip accepted: 8b05c4f
Production SHA at capture: ffd500c72649742627421e2f598f6208d3d65db8
Entry: /demo/start (Demo)
Auth: untouched (EXCLUDED)
Verdict: Core v5 LIVE captured — NO CPO PASS declared
```

## Deploy gate

- Poll attempts 1–4: `/api/build-info` = `75a2122` (pre-pin).
- Attempt 5: commit **`ffd500c`** — `shaMatch=true` against target `8b05c4f|ffd500c|8b30c51`.
- Capture session UTC: `2026-08-27T07:57:06.701Z`.
- Sources: `prod-build-info-poll.json`, `prod-build-info.json`.

## Engine changes shipped (W1–W10 summary)

From fix `8b30c51` (“Core v5 Living Understanding — critical-gap blocks analysis”), Long Sprint W1–W10 intent:

1. **W1 Causality** — next ask derived from prior understanding / unresolved gap (Q2 from A1).
2. **W2 understandingDelta** — every mergeable turn should expose what changed (confirmed / inferred / superseded).
3. **W3 Multi-fact / wrong-slot** — competitor + differentiation cues can emit distinct facts; competitor must not dump into CUSTOMER.
4. **W4 Differentiation distinct** — differentiation conversation fact separate from competitor-only cue.
5. **W5 Gap priority** — viability gaps (e.g. differentiation) prioritized over spine-only fills.
6. **W6 Critical-gap gate** — Start Analysis intended hard-blocked while critical viability gaps remain.
7. **W7 Judgment-loop UX** — CURRENT JUDGMENT + whyNow / processing stages on ask surfaces.
8. **W8 Conversation purity** — why / mid-summary / nonsense as display-only (non-mergeable).
9. **W9 Edit / contradiction** — prior-edit supersede + conflict resolution surfaces.
10. **W10 Evidence / capture** — unit tests + `_cpo-core-v5-prod-capture.spec.ts` Production Demo harness.

## Hard P0 — factual LIVE counts

| Gate | Observed | Evidence |
|------|----------|----------|
| Automated same-Q text (incl. why/mid/nonsense) | **4** | `reAskSameQuestionCount=4` (turns 5–7, 13 hints) |
| Wrong-slot hints | **1** | Turn 11: competitor answer into pricing Q |
| Mixed-Q hints | **5** | pending + turns 11, 12, 13, 16 (`mixed-competition+pricing+customer-on-one-screen`) |
| `criticalGapBlockedStartAnalysis` | **false** | Probe @ `17-sufficiency-start-probe`: visible=true, disabled=false, criticalCopy=false |

**LIVE note:** After Start Analysis, HOLD with Critical Unknown about competition/alternatives. Start Analysis was **not** blocked while critical gaps remained on LIVE Demo overview.

## Acceptance matrix (factual, not PASS)

| Item | Observation |
|------|-------------|
| Answer → Understanding | Problem → payer → differentiation path; coverage 15→25→35→50→60→65% |
| Next Question causality | Turn 3: payer after problem (Q2 from A1). Turn 4: differentiation after payer (before dedicated competitor ask) |
| Re-question | Automated same-Q ×4 (nonsense/why/mid/conflict surfaces); not a revenue×N loop |
| Wrong-slot | **1** hint (competitor→pricing Q pairing) |
| Why-now | Present on ask turns via purpose / judgment block |
| understandingDelta UI | Often **empty** in capture fields across turns |
| Nonsense | Rejected; Understanding unchanged (turn 5) |
| Why / mid-review | Display-only panels; return to same differentiation Q (turns 6–7) |
| Prior edit | Turn 8 CUSTOMER superseded to FIT + 국내 MZ |
| Contradiction | Turn 9 payer flipped to B2B; “(확인이 필요)” |
| Competition / pricing / diff | Interleaved; capture Q/A pairing noise on turns 10–13 |
| Sufficiency | Evidence-framed copy (“Not based on answer count”); Start Analysis enabled |
| Critical-gap block | **Not observed on LIVE** (`criticalGapBlockedStartAnalysis=false`) |
| Final | HOLD + Critical Unknown (competition/alternatives); score 70 supporting |
| Regression | Demo new-user + thin document seed path exercised |

## Residual risks (for CPO, not self-PASS)

1. **`criticalGapBlockedStartAnalysis=false` on LIVE Demo overview** — Start Analysis remained enabled; post-analysis HOLD still cites Critical Unknown on competition/alternatives.
2. **`understandingDelta` often empty in UI capture** — judgment blocks still show confirmed/uncertain/gap, but delta field did not populate in raw snaps.
3. **Capture Q/A pairing noise on pricing/competition** — competitor answer while pricing Q visible (turn 11); pricing answer while competitor Q visible (turn 12); defensibility while channel Q (turn 10).
4. **Differentiation asked before dedicated competitor ask in early turns** — turn 4 unresolvedGap=`differentiationVsAlternatives` after payer, ahead of a dedicated “비슷한 역할을…” competitor ask.
5. Conflict UI on turn 13 compared differentiation answer against prior customer edit — possible over-aggressive conflict detection.
6. Final SUMMARY includes template-like “Differentiation in B2B SaaS…” copy alongside tourism Demo context — mixed / stock phrasing risk.

## Explicit non-claims

- Does **not** claim CPO PASS or CEO Walkthrough GO.
- Does **not** claim critical-gap Start Analysis hard-block worked on this LIVE Demo run.
- Auth / KI-1 not exercised.
- Score 70 / coverage % alone is **not** treated as success.
- Unit-test intent (W6 block) is **not** equated to LIVE observation.

## Paths

- Full transcript: `docs/evidence/ALABOM/conversation-validation/core-v5/TRANSCRIPT.md`
- Raw: `docs/evidence/ALABOM/conversation-validation/core-v5/transcript-raw.json`
- Build info: `docs/evidence/ALABOM/conversation-validation/core-v5/prod-build-info.json`
- Poll: `docs/evidence/ALABOM/conversation-validation/core-v5/prod-build-info-poll.json`
- Media: `docs/evidence/ALABOM/conversation-validation/core-v5/media/`
- Playwright: `apps/web/e2e/_cpo-core-v5-prod-capture.spec.ts`

```text
CPO review: pending — do not PASS
CEO Walkthrough: HOLD
```
