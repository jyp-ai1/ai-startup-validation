# ALABOM Long Sprint — Known Issues

```text
Date: 2026-08-28 (KST)
CPO PASS: NOT declared — CEO turn-by-turn review pending
Auth: Deferred
```

## Open (non-blocking for CTO package)

| ID | Issue | Severity | Notes |
|----|-------|----------|-------|
| LS-1 | New User `/who` one-liner not separately captured | Medium | Demo `/demo/start` used as Journey A proxy; Auth deferred |
| LS-2 | Post-analysis identity drift HOLD | Low | Final surface: `확정된 사업 한 줄이 시작 의도와 맞지 않습니다` — not pricingHint |
| LS-3 | Generic delta fallback `이해 상태 갱신됨` on some turns | Low | Engine merged but delta summary generic; UX acceptable, not empty |
| LS-4 | B2B(확인이 필요) linger after conflict resolution | Low | Understanding panel tag after payer not-that clarifications |
| LS-5 | Full post-fix 33-turn LIVE re-capture | Process | Partial run to 28 turns @ f1894ba (delta=0); full run blocked by screenshot file lock on Windows |

## Fixed this sprint

| ID | Issue | Fix |
|----|-------|-----|
| LS-F1 | `understandingDelta` empty on mergeable turns (4) | Judgment block on issue-phase ask; delta on processing stages; E2E wait |
| LS-F2 | Loop exited before 30 turns @ 35d52dd | continue-refining CTA + harness `extendToMinTurns` @ 048b38e |
| LS-F3 | Project description placeholder | `ko.json` → "사업 아이디어를 자유롭게 설명해주세요..." |

## Explicitly deferred

- **Auth / KI-1** — no OAuth regression work this sprint
- **CPO PASS** — do not treat 048b38e or this package as PASS
- **CEO Walkthrough** — NOT READY until CPO PASS

## Regression watch

- same-meaning re-ask, wrong-slot, mixed-Q: **0 @ 048b38e** — preserve on every deploy
- Analysis Ready must not conflate with sufficiency %

## Escalation triggers (only)

Production outage · data loss · core regression · security/auth · scope change needing CEO
