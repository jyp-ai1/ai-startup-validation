# Sprint 0-4 — V2 UX QA + User Flow Validation

**Status:** 📋 NEXT (active)  
**Date:** 2026-07-27  
**Authority:** [SPRINT_0_V2_UX_RESET.md](./SPRINT_0_V2_UX_RESET.md) · ADR-019  
**Gate:** Legacy Journey removal (**Sprint 0-5**) runs **only after** this sprint passes

**Live report (fill during session):** [QA_REPORT_V2.md](../QA_REPORT_V2.md)

**QA type:** Product Validation — simulate a founder's first visit; record emotion (🙂😐😫), not button clicks alone.

---

## Why QA before Legacy deletion

> **지금은 기술 부채보다 제품 리스크가 더 큽니다.**

Legacy는 언제든 지울 수 있습니다. 삭제 후 다시 만드는 비용은 훨씬 큽니다.

**검증 질문:** V2가 정말 정답인가? 사용자가 Step 4(Investigate) 이후 *"아, 이거 계속 써야겠다"*라고 느끼는가?

**Product definition (locked):**

```text
사업성 검토 → AI PM Workspace
Validation Tool에서 시작 → AI PM으로 자연스럽게 성장
```

**절대 AI PM을 먼저 팔지 않는다.** 사업성 검토를 팔고, 끝나면 AI PM이 이어진다.

---

## Sprint metadata

| Field | Value |
|-------|-------|
| Sprint | 0-4 — V2 UX QA |
| Preview URL | _(local `pnpm dev` or deploy preview)_ |
| Tester | PM |
| Date | |

---

## Personas to validate (STEP 0)

Each persona should feel *"that's me"* within 5 seconds on `/who`.

| Persona | Route card | Pass? | Notes |
|---------|------------|-------|-------|
| 예비창업자 | ① 사업 아이디어 검토 | ☐ | |
| 기존사업자 | ② 창업 준비 / ③ 회사 운영 | ☐ | |
| 사내기획자 | ③ 회사 운영 | ☐ | |
| 컨설턴트 | ④ 투자 준비 (또는 아이디어 검토) | ☐ | |

**Question:** 정말 이 4분류가 맞는가? 빠진 persona가 있는가?

---

## Six-step flow validation

## Landing — Q0 / Q1 / Q2 (before Who)

Landing QA uses **three questions**, not one:

| # | Question | Pass? | Notes |
|---|----------|-------|-------|
| **Q0** | 5초 안에 **왜** 버튼을 눌러야 하는지 아는가? (*"내 사업이 될지 알고 싶다"*) | ☐ | |
| **Q1** | 5초 안에 **뭐 하는 서비스**인지 아는가? (사업성 검토) | ☐ | |
| **Q2** | **다음** 누를까? (망설임 없이) | ☐ | |

**Product sentence:** *사업을 검토해드립니다. 검토가 끝나면 AI PM이 계속 관리해드립니다.*

**Live results:** [QA_REPORT_V2.md](../QA_REPORT_V2.md) — STEP 1

---

### STEP 1 — Who (`/who`)

**Question:** 누가 쓰는가 — persona cards가 맞는가?

| Check | Pass? | Notes |
|-------|-------|-------|
| 5초 안에 자신의 역할 카드를 고를 수 있다 | ☐ | |
| 카드 copy가 "이 사업이 될까?" 수준으로 구체적이다 | ☐ | |

---

### STEP 2 — Workflow (`/workflow`)

**Question:** 사용자가 *"아 맞아, 내가 지금 이 단계지"*라고 느끼는가?

| Check | Pass? | Notes |
|-------|-------|-------|
| Persona별 workflow가 현재 상황과 맞다 | ☐ | |
| 다음 행동이 한 문장으로 명확하다 | ☐ | |

---

### STEP 3 — Validation (`/validation`)

**Question:** 정확도가 올라가는 구조(41% → 58% → 74% → 82%)가 재미있고 부담스럽지 않은가?

| Check | Pass? | Notes |
|-------|-------|-------|
| 입력이 부담스럽지 않다 (optional inputs) | ☐ | |
| 점수 progression이 engaging하다 | ☐ | |
| "점수를 올리고 싶다"는 동기가 생긴다 | ☐ | |

---

### STEP 4 — Investigate (`/investigate`) — **WOW moment**

**Question:** *"좋습니다. 제가 조사하겠습니다."* 순간이 LaunchLens의 WOW인가?

| Check | Pass? | Notes |
|-------|-------|-------|
| AI 등장 copy가 PM처럼 느껴진다 | ☐ | |
| 기다릴 가치가 있다 (pipeline steps visible) | ☐ | |
| 조사 중 이탈하지 않고 싶다 | ☐ | |

---

### STEP 5 — Conclusion (`/conclusion`)

**Question:** 30초 안에 GO · 왜 · 오늘 뭘 하면 되는지 이해되는가?

| Check | Pass? | Notes |
|-------|-------|-------|
| GO/HOLD가 30초 안에 이해된다 | ☐ | |
| "왜?"에 답한다 | ☐ | |
| "그래서 오늘 뭘 하면 되는데?"에 답한다 | ☐ | |

---

### STEP 6 — Workspace (`/workspaces` → `/workspace`)

**Question:** AI PM이 진짜 PM처럼 느껴지고, 매일 들어오고 싶은가?

| Check | Pass? | Notes |
|-------|-------|-------|
| Home: 프로젝트 카드만으로 상태 파악 가능 | ☐ | |
| Detail: AI PM briefing이 "어제 일 / 오늘 할 일"을 전달 | ☐ | |
| Decision panel: 결론 · 왜 · 부족 · 오늘 (no tabs) | ☐ | |
| 재방문 시 `/` → `/workspaces` redirect 자연스럽다 | ☐ | |

---

## V2 UX Checklist (screen-level)

| Screen | Question | Pass? | Notes |
|--------|----------|-------|-------|
| **Landing** | Q0 동기 · Q1 사업성 검토 · Q2 다음 행동 | ☐ | See [QA_REPORT_V2.md](../QA_REPORT_V2.md) |
| **Validation** | 입력이 부담스럽지 않은가? | ☐ | |
| **AI 조사** | 기다릴 가치가 있는가? | ☐ | |
| **결과** | "그래서?"에 답하는가? | ☐ | |
| **Workspace** | 매일 들어오고 싶은가? | ☐ | |

---

## Product QA — 5 questions (constitution)

| # | Question | Pass? | Notes |
|---|----------|-------|-------|
| 1 | **5초** 안에 "사업성 검토" 목적을 이해하는가? | ☐ | |
| 2 | 다음 행동을 **고민하지 않는가**? | ☐ | |
| 3 | 메뉴 없이 **Workflow를 따라가는가**? | ☐ | |
| 4 | AI 조사·결론이 **자연스러운가**? | ☐ | |
| 5 | Workspace까지 **계속 진행하고 싶은가**? | ☐ | |

---

## Functional baseline

- [ ] `pnpm lint && pnpm build`
- [ ] Full journey: `/` → `/who` → `/workflow` → `/validation` → `/investigate` → `/conclusion` → `/workspaces` → `/workspace`
- [ ] Return visit: `/` → `/workspaces` (cookie set)
- [ ] 새 프로젝트 → `/who`
- [ ] Legacy shell still reachable without V2 cookie (rollback safety)

---

## Result

| Gate | Status |
|------|--------|
| **6-step flow** | ☐ PASS · ☐ FAIL |
| **V2 UX Checklist (5 screens)** | ☐ PASS · ☐ FAIL |
| **Product QA (5/5)** | ☐ PASS · ☐ FAIL |
| **Blocking issues** | |

**If PASS → proceed to Sprint 0-5 (Legacy Journey removal)**  
**If FAIL → fix V2 only; do not delete Legacy**

**PM sign-off:** _______________ **Date:** _______________

---

## Related

- [TASKS.md](../TASKS.md) — Sprint 0-4 through 0-8
- [SPRINT_0_V2_UX_RESET.md](./SPRINT_0_V2_UX_RESET.md)
- [PRODUCT_CONSTITUTION.md](../PRODUCT_CONSTITUTION.md)
