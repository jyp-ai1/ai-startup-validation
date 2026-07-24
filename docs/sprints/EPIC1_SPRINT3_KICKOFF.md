# Epic 1 Sprint 3 — Kickoff

**Epic:** Goal & Workflow Experience  
**Sprint:** 3 — Decision Experience  
**Status:** 🟢 In progress — Preview only  
**PM approval:** ✅ Sprint 3 시작 (2026-07-24)  
**Prior QA:** [EPIC1_SPRINT2_QA_REPORT.md](./EPIC1_SPRINT2_QA_REPORT.md)

---

## Success sentence

> **Decision이 살아 움직이고, Confidence 타임라인과 Why Drawer로 사용자가 점수를 올리고 싶어진다.**

---

## Mission

Decision을 **살아있는 객체**로 만든다. Mock만 — LLM/API/DB 없음.

---

## Kickoff — 4 questions

### 1. 이번 Sprint에서 사용자가 달라지는 경험은?

HOLD가 고정이 아니라 **Mock Action으로 GO까지 변한다**. Confidence는 단계별 +8/+12 타임라인으로 **무엇을 하면 올라가는지** 보인다. Project Health 클릭 시 breakdown, Why는 항상 열리는 Drawer.

### 2. Workflow 단계

| Area | Sprint 2 | Sprint 3 |
|------|----------|----------|
| Decision | Static HOLD | Dynamic HOLD → GO (mock) |
| Confidence | 42% → 68% bar | Timeline 42→50→68→81 + per-task gains |
| History | 없음 | 오늘 HOLD → 조사 완료 → GO |
| Health | 숫자만 | Detail: 시장/재무/고객/실행 |
| Why | Inline list | Expandable Why Drawer |

### 3. PM 검증 — Product QA (Sprint 3)

1. Decision이 **살아있는가**?
2. 사용자가 **점수를 올리고 싶은가**?
3. 프로젝트가 **게임처럼** 느껴지는가?
4. **Why**를 누르게 되는가?
5. AI가 **프로젝트 매니저**처럼 느껴지는가?

### 4. Production?

⛔ **Private Preview only** until Epic 1 complete (PM release strategy).

---

## Scope

### In

- **Dynamic Decision** — mock button/action: HOLD → GO (optional NO GO state)
- **Confidence Timeline** — stepped gains with labels
- **Decision History** — today’s mock log
- **Project Health Detail** — expandable breakdown
- **Why Drawer** — expand → reasons → evidence placeholder
- Sprint 2 minor fix: confidence breakdown on coach panel
- Preview deploy · no prod

### Out / Forbidden

LLM · Prompt · API · Export · Report · PRD · real analysis · DB

---

## Completion ritual

```text
Implement → lint/build → Preview → PM Product QA (5) → HOLD until Epic 1 Alpha
```

---

## Cursor prompt

```text
GOAL: Epic 1 Sprint 3 — Decision Experience (living mock decision)
READ: PRODUCT_CONSTITUTION.md, EPIC1_SPRINT2_QA_REPORT.md, this file
BUILD: Dynamic verdict, confidence timeline, decision history, health detail, why drawer
FORBIDDEN: LLM/API/export/report
VERIFY: pnpm lint && pnpm build · Preview only
```
