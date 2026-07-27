# Sprint 2 — Go To Market Foundation

**Former name:** Landing Experience  
**Status:** 📋 ACTIVE — Sprint 2 started  
**Authority:** [LAUNCHLENS_ROADMAP_V1.md](../LAUNCHLENS_ROADMAP_V1.md) · ADR-031/032 · Rule #0  
**Principles:** [SPRINT_2_PRINCIPLES.md](../SPRINT_2_PRINCIPLES.md)

> `/validation` — bug fix only until Sprint 3.

---

## Epics & KPIs

See [SPRINT_2_PRINCIPLES.md](../SPRINT_2_PRINCIPLES.md) · Release: Lighthouse 90+ · Desktop/Tablet/Mobile screenshots

---

## Single goal

30초 안에 방문자가 말하게 만들 것:

> **"이거 그냥 AI가 문서 써주는 게 아니네."**

---

## User journey

```text
Landing → "아 이거 내가 필요했던 서비스인데?" → Demo → Login → Workspace
```

---

## Header IA

**비로그인**

```text
Product · Why LaunchLens · Pricing · Resources · Login · Start Free
```

**로그인** — GTM nav **제거**

```text
Workspace · Projects · Profile
```

Post-login: `/workspace` · Workspace = Home · Dashboard/Analytics/Settings ✗

**관리자** — [별도 IA](../LAUNCHLENS_ROADMAP_V1.md#관리자-별도--사용자-ia와-분리)

---

## Sections (order)

### Why LaunchLens (P0)

Problem narrative — [SPRINT_2_PRINCIPLES.md](../SPRINT_2_PRINCIPLES.md)

---

### Hero (P0)

```text
Think Better. Decide Better.
```

**CTA:** `Start Free` · `Open Demo`

---

### Live Demo (P0)

```text
Open Demo
────────────
AI SaaS 검토 예시
✓ 문제 · ✓ 고객 · ✓ 시장 · ✓ Review Board · ✓ Decision · ✓ Memory
```

Route: `/validation?demo=readonly` — **실제 동작**, 로그인 불필요

---

### How it Works (P0)

```text
아이디어 입력 → AI와 함께 생각 → Decision Memory 저장
```

---

### Pricing · FAQ · Footer (P2)

Structure now, copy later.

---

## Out of scope

- `/validation` feature work (Demo readonly only)
- Evidence Engine / Real AI (Sprint 3)
- Artifacts menu (Sprint 4 — AI proposes)
- Billing (Sprint 6) · Admin product UI (Sprint 7)

---

## Ship

Release Rule · North Star · Live Demo click-through QA

---

## Success

| Check | Target |
|-------|--------|
| 30초 | "문서 써주는 AI가 아니네" |
| North Star | 로그인 전 "나도 써봐야겠다" |
| Live Demo | Readonly workspace — 실제 동작 |

---

## P0 Hotfix — Routing & IA ✅

| Rule | Status |
|------|--------|
| `/` always Landing (no auto-redirect) | ✅ `cef5c97` |
| `/workspace` protected | ✅ login required |
| `/workspaces` → `/workspace` | ✅ legacy redirect |
| Login default → `/workspace` | ✅ |
| Demo public | ✅ `/validation?demo=readonly` |

### QA checklist

- [ ] `/` → Landing (logged out & logged in)
- [ ] Live Demo without login
- [ ] Start Free → Login → `/workspace`
- [ ] `/workspace` logged out → login required
- [ ] Logo logged-in → `/workspace`
