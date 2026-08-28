# ALABOM CPO Validation — Evidence Index

```text
Production URL: https://ai-startup-validation-tau.vercel.app
Production SHA: 086da4eb0468c69a7ab10976092172e1ba49dfa2
Captured: 2026-08-28 (KST)
CPO judgment: HOLD — do NOT declare PASS
CEO Walkthrough: NOT READY
```

## Package checklist (CPO turn-by-turn)

| # | Item | Path | Status |
|---|------|------|--------|
| 1 | Production URL | https://ai-startup-validation-tau.vercel.app | ✓ |
| 2 | Production SHA | [prod-build-info.json](./prod-build-info.json) | ✓ 086da4e |
| 3 | Test business input | W21 + supplemental seeds (tourism one-liner) | ✓ |
| 4 | FULL main transcript (33 turns) | [../conversation-validation/long-sprint-final/TRANSCRIPT.md](../conversation-validation/long-sprint-final/TRANSCRIPT.md) | ✓ reused |
| 5 | Final output captured | W21 T33 + [TRANSCRIPT-IDENTITY-FINAL.md](./TRANSCRIPT-IDENTITY-FINAL.md) | ✓ |
| 6 | New User result | [TRANSCRIPT-NEW-USER.md](./TRANSCRIPT-NEW-USER.md) | ✓ PASS |
| 7 | Back navigation result | [TRANSCRIPT-BACK-NAV.md](./TRANSCRIPT-BACK-NAV.md) | ✓ PASS (W21 T8) |
| 8 | Mobile result | [TRANSCRIPT-MOBILE.md](./TRANSCRIPT-MOBILE.md) | ✓ captured — **FAIL** (CTA not visible) |
| 9 | Identity drift result | [TRANSCRIPT-IDENTITY-FINAL.md](./TRANSCRIPT-IDENTITY-FINAL.md) | ✓ before/after |
| 10 | Regression summary | [FINDINGS.md](./FINDINGS.md) | ✓ |
| 11 | Known Issues | [../../sprints/ALABOM_LONG_SPRINT_CTO_KNOWN_ISSUES.md](../../sprints/ALABOM_LONG_SPRINT_CTO_KNOWN_ISSUES.md) | ✓ |
| 12 | CTO judgment | [../../sprints/ALABOM_LONG_SPRINT_CTO_FINAL_REPORT.md](../../sprints/ALABOM_LONG_SPRINT_CTO_FINAL_REPORT.md) | ✓ NOT CPO PASS |

## Transcript files

| File | Turns | Notes |
|------|-------|-------|
| [TRANSCRIPT.md](./TRANSCRIPT.md) | 33 (pointer) | Reuses long-sprint-final |
| [TRANSCRIPT-NEW-USER.md](./TRANSCRIPT-NEW-USER.md) | 5 | Demo one-liner LIVE |
| [TRANSCRIPT-BACK-NAV.md](./TRANSCRIPT-BACK-NAV.md) | 1 (+context) | W21 T8 prior edit |
| [TRANSCRIPT-MOBILE.md](./TRANSCRIPT-MOBILE.md) | 5 | 390×844 — FAIL CTA |
| [TRANSCRIPT-IDENTITY-FINAL.md](./TRANSCRIPT-IDENTITY-FINAL.md) | — | LS-2 before/after |

## Raw JSON

| File | Scenario |
|------|----------|
| [transcript-raw-new-user.json](./transcript-raw-new-user.json) | New User |
| [transcript-raw-mobile.json](./transcript-raw-mobile.json) | Mobile |
| [../conversation-validation/long-sprint-final/transcript-raw.json](../conversation-validation/long-sprint-final/transcript-raw.json) | W21 main |

## Media

| Folder | Contents |
|--------|----------|
| [media/](./media/) | Supplemental PNG (new-user, mobile) |
| [../conversation-validation/long-sprint-final/media/](../conversation-validation/long-sprint-final/media/) | W21 33 PNG |

## Sprint deliverables

| Document | Path |
|----------|------|
| CTO Final Report | [../../sprints/ALABOM_LONG_SPRINT_CTO_FINAL_REPORT.md](../../sprints/ALABOM_LONG_SPRINT_CTO_FINAL_REPORT.md) |
| CTO QA | [../../sprints/ALABOM_LONG_SPRINT_CTO_QA.md](../../sprints/ALABOM_LONG_SPRINT_CTO_QA.md) |
| Known Issues | [../../sprints/ALABOM_LONG_SPRINT_CTO_KNOWN_ISSUES.md](../../sprints/ALABOM_LONG_SPRINT_CTO_KNOWN_ISSUES.md) |
| FINDINGS | [FINDINGS.md](./FINDINGS.md) |

```text
CPO review: pending — do NOT declare PASS
CEO Walkthrough: NOT READY
```
