# Release Queue — LaunchLens

**North star:** Commercial Launch (v1.0)까지 모든 Release를 순차 완료한다.  
**Rule:** Mission 완료 ≠ Feature 완료. Mission 내 모든 Task·QA·배포·문서가 끝날 때만 Mission 종료.

## Hierarchy

```
Release → Product → Mission → Feature → Task → Sub-task
```

## Releases (consume top → bottom)

| # | Release | Est. Tasks | Status |
|---|---------|------------|--------|
| R1 | **Closed Beta** | 300–500 | **active** |
| R2 | Open Beta | 300–500 | queued |
| R3 | RC1 | 300–500 | queued |
| R4 | RC2 | 200–400 | queued |
| R5 | v1.0 Commercial | 500–1000 | queued |
| R6 | Real Intelligence | 1000+ | queued (PM gate: LLM/DB) |
| R7 | Commercial Scale | TBD | queued |

## Active: Closed Beta Release (R1)

**Exit criteria (experience, not feature):**

- Founder opens Landing → 5s内 "AI PM이 내 사업을 함께한다"
- Goal → Workflow → Workspace → GO in ~3 min (mock intelligence OK)
- Daily reopen: Morning Brief · Confidence · Decision feel real
- Lighthouse 95+ on Landing, Goal, Workflow, Workspace, Admin
- A11y 100 · Responsive 390–1920 · Critical bug 0

**Task tree:** `docs/releases/CLOSED_BETA_RELEASE.md`

## PM Gates (stop & escalate only)

DB schema · Auth · Billing · External API cost · LLM provider · Product pivot

## Cursor Cycle (per batch, not per task)

Implement → Self Review → Build → Lint → QA → Responsive → A11y → Perf → Commit → Push → Tag → **continue same Mission until all Tasks ✅**

## Reporting

08:00 KST Daily Autonomous Report only. No mid-batch "완료" messages.

## Production

https://ai-startup-validation-tau.vercel.app
