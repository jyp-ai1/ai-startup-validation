# ALABOM Core Conversation Engine v4 — FINDINGS (Production Demo)

```text
Date: 2026-08-27 (KST)
Fix commit: 7da3ed951f8af3861b018f298355affc7e7a5e4b
Production SHA at capture: 7da3ed951f8af3861b018f298355affc7e7a5e4b
Entry: /demo/start (Demo)
Auth: untouched (EXCLUDED)
Verdict: Core v4 LIVE captured — NO CPO PASS declared
```

## Deploy gate

- `7da3ed9` pushed to `origin/main`; Vercel promoted by poll attempt 3 (~2–3 min).
- `/api/build-info` commit **`7da3ed9`**; `shaMatch=true`.
- Local: Core v3/v4 unit tests 28/28; `pnpm --filter web build` green before push.

## Engine changes shipped (Long Fix, not mid-Phase tickets)

1. **Multi-fact semantics** — one utterance → multiple fact keys (buyer+revenue, competition+diff cues).
2. **Gap-level re-ask ban** — answered `targetGap` skipped; sticky `currentIssueId` yields after gap answered (payer≠forever revenue).
3. **Wrong-slot harden** — competitor/diff never dumps into CUSTOMER; section labels avoid `extractCustomer` `정의]` trap; AI PM header lines skipped in entity extract.
4. **Judgment UI** — CURRENT JUDGMENT (confirmed / uncertain / remaining gap / therefore ask) + “왜 지금 이 질문을 하나요?” details.
5. **Final output** — structured claim rows + `1차 사업성 검토 완료` closeout (not score-only).
6. **Coverage copy** — “이해 상태 커버리지 % (필드 채움률이 아님)”.

## Hard P0 — factual LIVE counts

| Gate | Observed | Evidence |
|------|----------|----------|
| Same-meaning **business** re-ask (revenue×N) | **0** | Turn 4: payer → competition; no turns 4–13 revenue loop |
| Wrong-slot (`정의]` / competitor→CUSTOMER) | **0** | `wrongSlotHints=[]`; CUSTOMER = 방한 외국인 → edit text |
| Automated same-Q text (incl. why/mid return) | 2 | Turns 5–6 only — display-only return to competition Q |

## Acceptance matrix (factual, not PASS)

| Item | Observation |
|------|-------------|
| Answer Understanding | State changes: problem→payer→competition; coverage 20→30→40→45→50% |
| Next Question | Derived from prior (problem→payer→competition) |
| Re-question | Business same-meaning **0**; why/mid same-Q return ×2 |
| Wrong-slot | **0** |
| Why-now | Every ask surface has whyNow / judgment block |
| Edit | Turn 7 prior-edit supersedes CUSTOMER |
| Conflict | Not triggered in this script |
| Mid-review | Display-only mid-summary (turn 6) |
| Competition | Entered after payer; Understanding + Competition analyzed |
| Sufficiency | Evidence-framed copy (“Not based on answer count”) |
| Final | HOLD + differentiation critical gap; score supporting |
| Regression | Demo new-user + document seed path |

## Residual risks (for CPO, not self-PASS)

1. Differentiation dedicated answer not isolated as its own turn (interleaved with prior-edit / channel / pricing).
2. Capture script once answered competition text while pricing Q was visible (turn 9) — engine advanced anyway; CPO may note question/answer pairing noise.
3. `understandingDelta` testid often empty on recognition-dismiss path — judgment block still shows confirmed/uncertain/gap.
4. Final conversational-final-output panel not always visible after analysis (HOLD review surface shown instead).

## Explicit non-claims

- Does **not** claim CPO PASS or CEO Walkthrough GO.
- Auth / KI-1 not exercised.
- Score 70 / coverage % alone is **not** treated as success.

## Paths

- Full transcript: `docs/evidence/ALABOM/conversation-validation/core-v4/TRANSCRIPT.md`
- Raw: `docs/evidence/ALABOM/conversation-validation/core-v4/transcript-raw.json`
- Media: `docs/evidence/ALABOM/conversation-validation/core-v4/media/`

```text
CPO review: pending — do not PASS
CEO Walkthrough: HOLD
```
