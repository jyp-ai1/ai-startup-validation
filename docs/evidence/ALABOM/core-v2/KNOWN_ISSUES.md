# ALABOM Core v2 — Known Issues

```text
Date: 2026-08-26
Production tip: c485ce78dd2151eb974c5591c07772a95a50db37
Feature ancestor: 89e3464
Source: Conversation Quality Verification (Demo)
```

## KI-CQ-1 — Form-like / wrong-slot merge (OPEN — CPO HOLD)

| Field | Value |
|-------|--------|
| **Status** | **OPEN** |
| **Severity** | Blocks conversational-quality PASS (not CTO A–F button PASS) |
| **Evidence** | `docs/sprints/ALABOM_CORE_V2_CONVERSATION_QUALITY_REPORT.md` · `docs/evidence/ALABOM/core-v2/conversation-quality/` |

**Observations (Production Demo):**

1. Answers merge into spine slots by issue template, not meaning — e.g. “관광객이 직접 결제합니다” → **PROBLEM**; “왜 그게 중요하죠?” → **CUSTOMER**.
2. After answering who pays, judgment still listed gap `payer` and re-asked “서비스 비용은 누가 지불하나요?”.
3. Contradictory payer answers both kept; contradiction UI not shown in captured path.
4. No mid-loop UI to edit an earlier answer and recompute.
5. Why challenge is not explained — treated as Fact.

## KI-1 — Auth durable (HOLD / Deferred)

Unchanged. Out of scope for this pack. Auth untouched.

## Notes (non-blocking for Demo entry)

| Note | Detail |
|------|--------|
| Cookie consent | May overlay confirm; dismiss first |
| Locale | EN chrome + KO ask surface common |
| Coverage % | Real (`구체화도` / `Business specificity`) — not decorative-only |
| Sufficiency copy | “Core understanding is sufficient. Ready for review.” can appear while ask loop still continues |
