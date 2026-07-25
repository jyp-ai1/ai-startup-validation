# PM Review Policy

**Effective:** 2026-07-25  
**Stage:** LaunchLens Closed Beta · Autonomous Development Mode  
**Production:** https://ai-startup-validation-tau.vercel.app

---

## Principle

PM is **CPO**, not QA PM.

Cursor owns: develop → QA → build → smoke → **Production deploy** → tag → morning report.

PM owns: **Product Vision**, experience PASS/FAIL, next Day Epic direction.

---

## Daily (every morning)

PM reviews **Production only** — not Preview.

| Check | Time |
|-------|------|
| Landing — service understood in 5s | ~1 min |
| Goal — frictionless selection | ~1 min |
| Workflow — no selection UI, one CTA | ~1 min |
| Workspace — register → thinking → coach → GO/HOLD | ~1 min |
| Today — AI speaks first | ~30 s |
| WOW — "오 괜찮다" in ~3 min | ~30 s |

**Total:** ~5 minutes on Production.

Preview URL is **not** included in Autonomous Reports.

---

## Standard Sprint pipeline (Cursor autonomous)

```text
Develop
  ↓
Internal QA (functional + product smoke)
  ↓
Build PASS
  ↓
Preview Deploy (internal — Cursor QA only)
  ↓
Smoke PASS
  ↓
Production Deploy
  ↓
Git Tag
  ↓
Morning Report (Production URL + Tag + QA + Known Issues + Next Epic)
```

PM does **not** block on Preview for standard sprints.

---

## When Preview requires PM approval

Production deploy is **forbidden** until PM approves Preview for:

| Category | Examples |
|----------|----------|
| **Product Pivot** | IA change, navigation overhaul, workflow redesign |
| **UX overhaul** | Landing full redesign, workspace re-architecture |
| **Auth** | Login/session architecture change |
| **Billing** | Pricing, payments, plans |
| **Real AI** | LLM provider, prompts, cost-bearing APIs |
| **Database** | Schema migration, persistence model change |
| **Cost** | OpenAI, Gemini, Claude, Perplexity integration |
| **Design system** | Full visual rebrand |

Report format for these cases:

```text
Preview URL: (required)
Production: BLOCKED — awaiting PM approval
```

---

## Autonomous Report format (standard)

```text
========================
LaunchLens Autonomous Report
========================

Version
Production          ← PM checks this only
Commit
Tag
QA
새로운 사용자 경험
Known Issues
다음 Epic
현재 진행률
========================
```

**Do not include Preview URL** unless PM approval is required (see above).

---

## Operating cadence

| Who | When | Action |
|-----|------|--------|
| Cursor | 24h cycle | Dev → QA → Prod → Tag → Report |
| PM | Morning | Production 5-min checklist → PASS/FAIL → next Day Epic |
| PM | As needed | Product Vision / pivot only |

**Rule:** *사용자가 체감하지 못하는 기능은 만들지 않는다.*

**Epic priority:** Journey → Intelligence → Analytics → Performance → Real AI

---

## Related docs

- [SPRINT_PROCESS.md](./SPRINT_PROCESS.md) — updated for autonomous mode
- [AUTONOMOUS_REPORT_v2.1.0.md](./sprints/AUTONOMOUS_REPORT_v2.1.0.md) — Day 1 example
