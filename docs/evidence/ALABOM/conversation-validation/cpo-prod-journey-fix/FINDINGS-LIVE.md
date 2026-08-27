# ALABOM conversation-validation — FINDINGS-LIVE (Production Demo)

```text
Date: 2026-08-27 (KST)
Production SHA: 89eb5b166e80… (full `89eb5b166e80a9539f665c2e9b3b0808ca0f5a02`)
Expected fix tip: 69a6eb1 / b134fa9 — NOT live at capture time
Entry: /demo/start
Auth: untouched
Verdict: factual observations only — NO CPO PASS
```

## Deploy gate

- Polled `/api/build-info` ~20+ minutes; commit remained `89eb5b1` while `origin/main` is `b134fa9`.
- LIVE journey executed anyway to produce **turn-by-turn UI evidence** on current Production (pre-fix).

## LIVE observations (89eb5b1)

1. **Template / stock phrasing** — `stock-template-phrasing` flagged on turns [2, 3, 4, 5, 6, 7, 8, 9]… (15/19 turns).
2. **Re-ask loop** — same demand/market question text repeated from turn 5 through 13 (`re-ask-same-question-text`).
3. **Wrong-slot / drift signals** — stuck on customer/demand framing while answers targeted problem/payer/competitor bank; payer-specific gap not exercised before loop.
4. **Mid review** — `지금까지 이해한 사업 정리해줘` did not advance gap state; next question unchanged.
5. **Sufficiency path** — overview/sufficiency surface reached; `readyReviewCopy=true`; start-analysis clicked; review-like copy after (`finalReviewReachable=true`).
6. **Screenshots** — `docs/evidence/ALABOM/conversation-validation/cpo-prod-journey-fix/media/`.

## Comparison to engine pack (`FINDINGS.md` / `TRANSCRIPT.md`)

| Check | Engine @ 69a6eb1 | LIVE @ 89eb5b1 |
|-------|------------------|----------------|
| Gap-driven Q order | observed | **not observed** (template + re-ask) |
| whyNow ↔ targetGap | aligned | **misaligned / generic** |
| Payer → buyer fact | yes | **not reached** (loop) |
| Intent drift gate | tourism pinned | **not on this deploy** |
| Nonsense isolation | engine only | not run on LIVE this pass |

## Residual

- **BLOCKED for fix verification** until Vercel Production commit starts with `69a6eb1`.
- After deploy: re-run same Playwright spec; expect turn table to diverge from rows above.

## Explicit non-claims

- Does **not** claim CPO PASS.
- Auth not exercised.
- **READY FOR CPO TURN REVIEW** on LIVE evidence (pre-fix baseline); post-fix re-capture still pending deploy.
