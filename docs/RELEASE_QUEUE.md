# Release Queue — LaunchLens

**Mode:** Release Queue Consumer v6 — read `docs/QUEUE_STATE.md` → execute → repeat until roadmap end.

**North star:** Commercial Launch (v1.0)까지 모든 Release 순차 완료. **Never stop at Release boundary.**

## Hierarchy

```
Release → Product → Mission → Epic → Sprint → Feature → Task → Sub-task
```

## Releases (auto-chain)

| # | Release | Tasks | IDs | Status |
|---|---------|-------|-----|--------|
| R1 | **Closed Beta** | 300 | T001–T300 | **active** 55/300 |
| R2 | Open Beta | 280 | T301–T580 | queued |
| R3 | RC1 | 240 | T581–T820 | queued |
| R4 | RC2 | 200 | T821–T1020 | queued |
| R5 | v1.0 | 500 | T1021–T1520 | queued |
| R6 | Real Intelligence | 1000+ | T1521+ | PM gate |
| R7 | Commercial Scale | TBD | — | queued |

## Consumer cycle (per Task)

Implement → QA → Commit → Push → Production → Tag → Release Note → ROADMAP update → **next Task**

No approval · No questions · No mid-report "완료"

## Stop only

Roadmap end · PM gate (LLM/DB/Billing/Auth/cost) · Build fail · Prod outage · CPO stop

## Sources

- `docs/ROADMAP_QUEUE.md` — numbered tasks
- `docs/releases/CLOSED_BETA_RELEASE.md` — R1 detail tree
- `.cursor/rules/infinite-queue-consumer.mdc` — v6 directive

## Reporting

08:00 KST Daily Production Report — `docs/templates/DAILY_AUTONOMOUS_REPORT.md`

## Production

https://ai-startup-validation-tau.vercel.app
