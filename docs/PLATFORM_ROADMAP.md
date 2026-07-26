# LaunchLens Platform Roadmap

**Status:** Active (2026-07-26)  
**Phase:** Post-Sprint — **Platform**, not UX  
**North Star:** *대표는 매일 10분만 LaunchLens를 열면 되고, AI PM은 나머지 시간 동안 회사를 계속 운영하고 있다.*

---

## CPO Assessment (2026-07-26)

Sprint 1–20 **Founder Experience / UX** is substantially complete. **AI Company intelligence** is still early.

| Area | Status | Evaluation |
|------|--------|------------|
| Founder Onboarding | ✅ ~95% | Good enough |
| AI PM Persona | ✅ ~95% | Consistent |
| Daily Habit | ✅ ~90% | Revisit reason exists |
| Explainable AI | ✅ ~80% | Direction good |
| Trust UX | ✅ ~90% | Strong |
| **Real Intelligence** | ⚠️ ~35–40% | Just started |
| **Production Architecture** | ⚠️ ~30% | Biggest gap |
| **Real business data** | ⚠️ ~20% | Mostly mock/rule-based |

**Judgment:** Stop adding UI components. Competitive advantage = **what data AI collects, how it reasons, what evidence backs execution proposals.**

---

## Sprint → Platform transition

| Era | Scope | Status |
|-----|-------|--------|
| Sprint 1–5 | Analysis & trust | ✅ |
| Sprint 6–8 | Daily CEO habit + background AI shell | ✅ |
| Sprint 9–20 | AI OS UX surfaces | ✅ |
| **Platform Phase** | Real intelligence + production | **NOW** |

Founder UX track: [FOUNDER_OS_ROADMAP.md](./FOUNDER_OS_ROADMAP.md)

---

## Platform phases

### Phase 1 — AI Intelligence Platform ★★★★★ (NOW)

Only **Research + OpenRouter** is real today. Target:

```
Research → Competitor → Market → Pricing → Government → Customer → Investment
```

Each domain = dedicated intelligence provider (OpenRouter + mock fallback).

**Code:** `@repo/agents` → `intelligence/platform/` · `POST /api/intelligence/platform-run`

---

### Phase 2 — Company Knowledge Graph ★★★★★

Connect:

```
Founder → Project → Customer → Competitor → Evidence → Decision → Memory → Action → Outcome
```

Enables cross-domain reasoning (e.g. last month's interview pain ↔ today's competitor shift).

**Code:** `buildCompanyKnowledgeGraph()` in `@repo/agents`

---

### Phase 3 — Autonomous Company Engine ★★★★★

```
AI investigates → analyzes → compares → writes report → Founder approves → AI generates next work
```

Builds on Phase 1 overnight runs + Phase 2 graph.

---

### Phase 4 — Founder Twin ★★★★☆

Learn decision style: conservative / aggressive / price-sensitive / market-first / tech-first.

Beyond "GO probability %" — train on real decision log.

---

### Phase 5 — Operating System ★★★☆☆

LaunchLens = **company operating system**, not validation tool.

Morning: AI PM → today's work → company state → risk → investment → customer → competitor → revenue → execution.

---

## Development priority (locked)

### Priority 1 ★★★★★

- [x] Intelligence Platform scaffold (`runIntelligencePlatform`)
- [x] Knowledge Graph types + builder
- [ ] OpenRouter per-domain hardening
- [ ] Competitor Intelligence (real feeds)
- [ ] Pricing Intelligence
- [ ] Customer Intelligence

### Priority 2 ★★★★★

- [x] `BackgroundRunRepository` interface (`@repo/core`)
- [ ] DB persistence (Supabase/Prisma adapter)
- [ ] Vercel Cron overnight job
- [ ] Snapshot store (server)

### Priority 3 ★★★★☆

- [ ] Founder Twin learning engine
- [ ] Company Memory (server-backed)

### Priority 4 ★★★☆☆

- [ ] Fundraising module (real)
- [ ] Growth Engine (real)
- [ ] Board Meeting (real LLM)
- [ ] Scenario Simulator (real model)

---

## What we stop doing

- New Today-workspace UI panels
- New sprint UX surfaces without real intelligence backing
- Mock-only features marketed as "AI did work"

---

## Related

- [FOUNDER_OS_ROADMAP.md](./FOUNDER_OS_ROADMAP.md) — UX sprints 6–20 ✅
- [DECISIONS.md](./DECISIONS.md) — ADR Platform pivot
- [TASKS.md](./TASKS.md) — active platform work
- [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md)
