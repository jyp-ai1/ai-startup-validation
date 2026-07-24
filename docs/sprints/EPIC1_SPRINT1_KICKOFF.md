# Epic 1 Sprint 1 — Kickoff

**Epic:** Goal & Workflow Experience  
**Sprint:** 1 — First journey shell  
**Status:** Ready for implementation (Sprint 0 constitution ratified)  
**PM approval:** ☐ Pending implementation start

---

## Success sentence (constitution)

> **사용자는 Goal 하나만 선택하면, AI가 자신에게 필요한 Workflow를 자동 구성하고, 다음에 무엇을 해야 하는지 고민하지 않아도 된다.**

---

## Kickoff — 4 questions

### 1. 이번 Sprint에서 사용자가 달라지는 경험은?

Landing CTA → **Goal 선택** → AI Workflow 생성 → **Strategy Workspace** 첫 화면.  
메뉴 대시보드 진입이 아닌 **가이드형 여정** 시작.

### 2. Workflow 단계

| Step | Before | After |
|------|--------|-------|
| Goal | 없음 (dashboard/login) | Goal Selection screen |
| Workflow | 없음 | AI-generated step list (mock/template OK) |
| Workspace | Menu dashboard | Strategy Workspace shell on Step 1 |

### 3. PM 검증 — Product QA (5 questions)

1. 5초 안에 서비스 목적을 이해하는가?
2. 다음 행동을 고민하지 않는가?
3. 메뉴를 찾지 않고 Workflow를 따라가는가?
4. AI 추천이 자연스러운가?
5. 계속 진행하고 싶은가?

### 4. Production 배포 가능?

Yes — shell routes + KO copy + preview deploy. No new AI models or analysis engines.

---

## Scope

### In

- Landing hero/copy aligned to [PRODUCT_CONSTITUTION.md](../PRODUCT_CONSTITUTION.md) North Star (KO)
- `/goal` or equivalent Goal Selection (5 goals from Constitution IA)
- Workflow creation screen (template/mock AI plan — no new LLM features)
- Strategy Workspace shell (progress + AI Guide placeholder + step 1 empty state)
- CTA path: Landing → Goal → Workflow → Workspace (not raw `/dashboard`)
- UX Laws enforced (≤7 nav, 1 primary CTA per screen)
- `pnpm lint && pnpm build` · Preview deploy · smoke

### Out

- New analysis (SWOT, TAM, research execution)
- Prompt changes · Export · New AI providers
- Full migration of legacy sidebar (wrap/hide in shell OK)

### Forbidden

Per Constitution + Sprint 0: AI models, analysis features, tools, prompt rewrites, export.

---

## Implementation notes (Senior Engineer)

- Reuse `@repo/ui`, existing auth, demo path where possible
- Legacy `/dashboard` may redirect or remain for beta; **new user path** is constitution flow
- Korean-first strings in `packages/i18n` ko.json
- Read [PRODUCT_CONSTITUTION.md](../PRODUCT_CONSTITUTION.md) before every PR

---

## Completion

```text
Preview → PM Product QA (5 questions) → Functional QA → Production → tag epic1-sprint1
```

---

## Cursor prompt (when PM says start)

```text
GOAL: Epic 1 Sprint 1 — Goal & Workflow journey shell
READ FIRST: docs/PRODUCT_CONSTITUTION.md, this file
BUILD: Landing (North Star KO) → Goal Selection → Workflow create → Strategy Workspace shell
FORBIDDEN: new AI/analysis/export/prompts
UX LAWS: nav ≤7, 1 CTA/screen, workflow visible
PRODUCT QA: 5 questions in UX_QA_TEMPLATE.md
VERIFY: pnpm lint && pnpm build · Preview deploy
```
