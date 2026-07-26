# LaunchLens V2 Pivot — Sprint 0: UX Reset

**Status:** Active  
**Date:** 2026-07-26  
**Type:** **Reset** — not feature addition, not IA polish  
**Authority:** Supersedes Sprint P0 IA Freeze and Sprint 21–26 UI freeze for this sprint only  
**Constitution:** [PRODUCT_CONSTITUTION.md](../PRODUCT_CONSTITUTION.md) · ADR-018 in [DECISIONS.md](../DECISIONS.md)

---

## Declaration

> **이번 Pivot은 AI PM Workspace를 만드는 것이 아니라, 사업성 검토 → AI PM Workspace로 자연스럽게 이어지는 경험을 만드는 것이다.**

지난 수십 Sprint의 문제는 **기능 부족이 아니라 IA**였다.

**Sprint 0 원칙:**

- 기존 UI 모두 잊는다
- 추가하지 않는다 — **삭제한다**
- 심플하게 만든다
- **엔진은 유지**, 화면만 완전히 새로 설계

---

## North Star (Sprint 0)

**3초** 안에 이해되고 · **30초** 안에 결과를 얻으며 · **매일** 다시 들어오는 AI PM Workspace

---

## UX Philosophy

LaunchLens는 **Validation Tool**로 시작하고, 결국 **AI PM**으로 성장한다.

**절대 AI PM으로 시작하지 않는다.**

---

## User Flow

```text
Landing
    ↓
누구신가요? (4 cards)
    ↓
Workflow 결정
    ↓
사업 검토 (Validation)
    ↓
AI 조사
    ↓
결론
    ↓
Workspace 생성
    ↓
Workspace 목록
    ↓
AI PM Office (2-col: AI PM | Decision)
```

**회사 운영 persona:** Validation 생략 → Workspace 목록 → AI PM

---

## Steps (Product Spec)

### STEP 0 — `/who`

카드 4개:

1. ① 사업 아이디어 검토 — *이 사업이 될까요?*
2. ② 창업 준비 — *사업을 시작하려고 합니다.*
3. ③ 회사 운영 — *AI PM과 함께 운영하고 싶습니다.*
4. ④ 투자 준비 — *IR을 준비하려고 합니다.*

### STEP 1 — `/workflow`

Persona별 workflow 표시 (아이디어 / 운영 / 투자 경로)

### STEP 2 — `/validation`

- 사업 아이디어 입력
- 사업 가능성 % (기본 41%)
- 선택 입력: 문제 · 고객 · MVP · 가격 → 점수 상승 (강요 없음)
- 80%+ → AI 조사 시작

### STEP 3 — AI 조사 (기존 `AiPmLiveWorkspace` 엔진, `/workspace` phase 또는 `/research`)

### STEP 4 — `/conclusion`

- 큰 카드: 사업 가능성 · GO
- AI PM 의견 3줄
- 상세 펼침 (시장 · 경쟁 · 가격 · 정부지원)

### STEP 5 — Workspace 생성 CTA

### STEP 6 — `/workspaces`

상단 `Workspace` · 카드 목록 (점수 · GO/HOLD · 업데이트 건수)

### STEP 7 — `/workspace`

2열: **AI PM | Decision** — 좌우 3열 없음

---

## Design Principles

### Onboarding (STEP 0–4): single column

```text
────────────────────────
Header
────────────────────────
AI PM (대화)
────────────────────────
결과
────────────────────────
상세 (펼침)
────────────────────────
```

### Workspace only: 2 columns

```text
AI PM  │  Decision
```

**Keywords:** Cursor · Linear · Notion · Perplexity · Apple  
**Never:** Dashboard

---

## Delete (UI only — engines kept)

| Remove | Keep (engine) |
|--------|----------------|
| 좌측 8단계 Workflow Rail | Validation Score |
| 우측 탭 9개 | AI 조사 pipeline |
| 3열 Shell | Competitive Intelligence |
| Report Card stacks | Strategy Engine |
| Decision Card 여러 개 | OpenRouter |
| Timeline / Living Project / CEO OS panels | Knowledge Graph |
| Sprint 9–20 UI surfaces | AI PM Memory · Workspace data |

---

## Definition of Done

- [ ] 5초 안에 현재 단계를 이해한다
- [ ] 30초 안에 사업성 결과를 확인한다
- [ ] 1분 안에 AI PM Workspace를 생성한다
- [ ] 다음날 재접속 시 AI PM이 변경사항을 먼저 보고한다
- [ ] 모든 화면이 "다음에 무엇을 해야 하는가?"를 **한 문장**으로 안내한다

**Sprint 종료 시 사용자는 3가지만 이해:**

1. **이 사업은 될까?** → AI가 판단한다
2. **왜 그렇게 판단했지?** → 조사 결과를 보여준다
3. **그다음은?** → AI PM Workspace에서 계속 함께 운영한다

---

## Implementation Order

1. ✅ Sprint 0 kickoff doc + ADR-018
2. ✅ V2 persona + `/who` + shells
3. ✅ **Sprint 0-1:** Validation flow routes wired end-to-end
4. ✅ **Sprint 0-2:** Workspace List as Home (return path, nav)
5. ✅ **Sprint 0-3:** Workspace Detail polish (morning copy, optional inputs)
6. 📋 **Sprint 0-4:** **V2 UX QA + user flow validation** — [SPRINT_0_4_V2_UX_QA.md](./SPRINT_0_4_V2_UX_QA.md) · **live report:** [QA_REPORT_V2.md](../QA_REPORT_V2.md) · ADR-019
7. ⬜ **Sprint 0-5:** Legacy Journey UI removal (Goal, Registration, Live, 3-col, rail, tabs)
8. ⬜ **Sprint 0-6:** Landing trim (feature grid, hero)
9. ⬜ **Sprint 0-7:** OpenRouter real data
10. ⬜ **Sprint 0-8:** Background AI

**Do not delete legacy before 0-4 QA PASS** — product risk > tech debt. Legacy is rollback safety until V2 is validated.

---

## Key Files (V2)

| Area | File |
|------|------|
| Persona | `features/workflow-journey/types/v2-persona.ts` |
| Cookies | `lib/v2-journey-cookies.ts` |
| Who | `components/v2/persona-selection-view.tsx` |
| Validation | `components/v2/v2-validation-view.tsx` |
| Shell (1-col) | `components/v2/v2-journey-stack.tsx` |
| Shell (2-col) | `components/v2/v2-workspace-shell.tsx` |
| Layout | `components/v2/v2-workspace-layout.tsx` |
| Routes | `app/[locale]/(public)/who|validation|conclusion|workspaces/` |
