# ALABOM Core Final — FINDINGS (Production Demo)

```text
Date: 2026-08-27 (KST)
Engine fix: 6e34fe6 (Core Final conversation engine)
Pins / tips: 9eef22f · 02a0126 (LIVE capture) · 0069ce5 (post-capture relevance-slot fix)
Production SHA at capture: 02a0126565a83579bfb67885b731108fee564ca1
Entry: /demo/start (Demo)
Auth: untouched (EXCLUDED)
Verdict: Core Final LIVE captured — NO CPO PASS declared
```

## Hard P0 — factual LIVE counts

| Gate | Observed | Evidence |
|------|----------|----------|
| understandingDelta empty (mergeable) | **19** | transcript-raw observations |
| Automated same-Q text | **20** | mostly validationTestability stuck (T10–T27) |
| Wrong-slot hints | **0** | wrongSlotHints |
| Mixed-Q hints | **0** | ask-surface only |
| criticalGapBlockedStartAnalysis | **null** | Start Analysis probe on Overview |
| domain contamination hits | **0** | no B2B SaaS template on tourism body |

## What improved vs Core v5 HOLD

1. **understandingDelta** appears on answer surface after mergeable turns (early turns T3–T7 show existing/new/unknown).
2. **Nonsense reframe** — T5 wording differs from stock problem Q (current understanding grounded).
3. **Why / mid reframe** — T6–T7 not identical stock re-ask; contextual whyNow.
4. **mixed-Q = 0** on ask surface (dual-ask validationTestability split; body pollution removed from detector).
5. **wrong-slot = 0** in this capture.
6. **Adaptive order** — competitor before differentiation on first ask (T2).
7. **Judgment gate copy** early turns show `Start Analysis는 차단` while critical gaps remain (AI PM panel).
8. **domain contamination = 0**.

## Residual risks (for CPO, not self-PASS)

1. **validationTestability stuck loop (T10–T27)** — relevance answers with 「고객」 were stolen into customer slot on SHA `02a0126`. Follow-up `0069ce5` forces asked-gap `diffRelevance` (not yet re-captured on LIVE).
2. **understandingDelta empty on many later mergeable snaps** — recognition/answer phase timing; early mergeable turns non-empty.
3. **criticalGapBlockedStartAnalysis=null on Overview probe** — Start Analysis CTA not visible on Overview at probe; early AI PM panel did show block copy.
4. **False "Core understanding is sufficient"** still appears in spine while PROBLEM Needs confirmation — capture now ignores that as final when Needs confirmation remains.
5. Follow-up SHA `0069ce5` not included in this LIVE session — CPO should treat relevance-loop as known residual until re-capture.
6. **Post-capture W14:** stock Overview `summaryBody` i18n (“Differentiation in B2B SaaS…”) replaced with domain-neutral Living-spine summary (ship after this FINDINGS baseline).

## Explicit non-claims

- Does **not** claim CPO PASS or CEO Walkthrough GO.
- Does **not** claim all hard metrics are mergeable-green.
- Auth / KI-1 not exercised.
- Unit-test intent is **not** equated to LIVE observation.

## Paths

- Full transcript: `docs/evidence/ALABOM/conversation-validation/core-final/TRANSCRIPT.md`
- Raw: `docs/evidence/ALABOM/conversation-validation/core-final/transcript-raw.json`
- Build info: `docs/evidence/ALABOM/conversation-validation/core-final/prod-build-info.json`
- Media: `docs/evidence/ALABOM/conversation-validation/core-final/media/`
- Playwright: `apps/web/e2e/_cpo-core-final-prod-capture.spec.ts`

```text
CPO review: pending — do not PASS
CEO Walkthrough: HOLD / FORBIDDEN
```
