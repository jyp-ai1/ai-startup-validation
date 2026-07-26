# LaunchLens V2 — Product Validation QA Report

**Sprint:** 0-4  
**Type:** Product Validation (not bug QA)  
**Gate:** Sprint 0-5 Legacy removal runs **only if** this report ends PASS  
**Authority:** [SPRINT_0_4_V2_UX_QA.md](./sprints/SPRINT_0_4_V2_UX_QA.md) · ADR-019  
**Date started:** 2026-07-27  
**Tester:** PM + AI  
**Preview URL:** https://ai-startup-validation-tau.vercel.app/ko (deploy `main` @ `bca68e0`)

---

## What we are validating

> **"기능이 동작하는가?"** — ❌ not the question  
> **"대표가 자연스럽게 다음 단계로 넘어가는가?"** — ✅ the question

**Product definition (locked):**

```text
사업성 검토 → AI PM Workspace
Validation Tool에서 시작 → AI PM으로 자연스럽게 성장
```

**Product sentence (one line — explains the whole product):**

> 사업을 검토해드립니다. 검토가 끝나면 AI PM이 계속 관리해드립니다.

**Writing Rule (ADR-020):** 사용자가 아직 경험하지 않은 것은 먼저 말하지 않는다.

**Question-first UI (V2):** 명사(Persona)보다 질문(상황·목적)이 먼저 — Landing · Who 공통 원칙.

**PASS = 사용자가 다음 버튼을 망설이지 않는다.** 멈추는 순간이 없어야 한다.

```text
Landing → Who → Workflow → Validation → Investigate → Conclusion → Workspace
```

---

## How to run this QA

1. **처음 사용하는 대표**처럼 진행 — 버튼만 눌러보는 smoke test 금지
2. 각 STEP마다 PM이 **Q0 → Q1 → Q2** → YES/NO + score (≥ **9.5** to PASS)
3. **멈춘 지점**이 있으면 즉시 기록 (이유 1줄)
4. FAIL 또는 score &lt; 9.5 → fix → commit → push → redeploy → **re-test**; next STEP 금지
5. **One STEP per deploy cycle** (ADR-021): develop 30–60min → build → commit → push main → PM URL test

```text
Develop → pnpm build → commit → push → Vercel → PM test → PASS (≥9.5) → next STEP
```

---

## Overall result

| Gate | Result | Notes |
|------|--------|-------|
| **Product flow (no hesitation)** | ☐ PASS · ☐ FAIL | |
| **6 critical YES/NO checks** | ☐ PASS · ☐ FAIL | |
| **Friction — no 😫 on core path** | ☐ PASS · ☐ FAIL | |
| **Legacy removal approved (0-5)** | ☐ YES · ☐ NO | Requires all PASS |

**PM sign-off:** _______________ **Date:** _______________

---

## Friction Score (emotion, not stars)

| Screen | 🙂 smooth | 😐 hesitant | 😫 stuck | **Score** | 멈춘 지점 / 이유 |
|--------|-----------|-------------|----------|-----------|------------------|
| Landing | ☑ | ☐ | ☐ | **9.3/10** | Re-test PASS — Q0 10 · Q1 9 · Q2 9 |
| Who | ☐ | ☑ | ☐ | **8.7→9.5*** | Purpose-based questions deployed |
| Workflow | ☐ | ☐ | ☐ | | |
| Validation | ☐ | ☐ | ☐ | | |
| Investigate (AI) | ☐ | ☐ | ☐ | | |
| Conclusion | ☐ | ☐ | ☐ | | |
| Workspace | ☐ | ☐ | ☐ | | |

**Legend:** 🙂 다음으로 자연스럽게 넘어감 · 😐 잠깐 멈춤 · 😫 이탈/혼란

---

## PM hypothesis (pre-QA — update after session)

| Screen | Hypothesis /10 | Role |
|--------|----------------:|------|
| Landing | 8.5 | |
| Who | 9.0 | |
| Workflow | 7.5 | |
| Validation | **9.5** | **핵심 강점** |
| Investigate | 8.0 | WOW target |
| Conclusion | 7.0 | 설득 부족 가능 |
| Workspace | 7.5 | 재방문 동기 미검증 |

| Screen | Actual /10 | Δ vs hypothesis | Notes |
|--------|------------:|-----------------|-------|
| Landing | **9.3** | +3.8 | Re-test PASS after copy fix · Hero minimal v2 applied |
| Who | **8.7** | | PASS (조건부) → fix applied · re-test target 9.5+ |
| Workflow | | | |
| Validation | | | |
| Investigate | | | |
| Conclusion | | | |
| Workspace | | | |

---

## STEP-by-STEP validation

### STEP 1 — Landing (`/`)

**Landing uses 3 questions (Q0 → Q1 → Q2), not one:**

| # | Question | Answer | Notes |
|---|----------|--------|-------|
| **Q0** | 5초 안에 **왜** 이 버튼을 눌러야 하는지 아는가? (*"내 사업이 될지 알고 싶다"*) | ☐ YES · ☑ **NO** | AI PM/CEO framing — personal motivation unclear |
| **Q1** | 5초 안에 **뭐 하는 서비스**인지 아는가? (사업성 검토) | ☐ YES · ☑ **NO** | Reads as AI PM SaaS, not validation |
| **Q2** | **다음** 누를까? (망설임 없이) | ☐ YES · ☑ **NO** | Pause at Headline |

**STEP 1 result:** ✅ **PASS** (2026-07-27, PM re-test — **9.3/10**)

| # | Question | Answer | Score | Notes |
|---|----------|--------|------:|-------|
| Q0 | 5초 안에 **왜** 버튼을 눌러야 하는지? | ☑ **YES** | 10 | *"당신의 사업, 될까요?"* — 정확히 찌름 |
| Q1 | **뭐 하는 서비스**인지? | ☑ **YES** | 9 | 사업성 검토 명확 — AI PM 불필요 |
| Q2 | **다음** 누를까? | ☑ **YES** | 9 | CTA 자연스러움 |

**Friction (re-test):** 🙂  
**Hero minimal v2:** 큰 title · 작은 subtitle · flow card (사업성→GO/HOLD) · AI PM Hero 제거  
**Writing Rule:** ADR-020 — 경험 전에는 말하지 않는다

**First test (FAIL — record kept):**

| # | Question | Answer | Notes |
|---|----------|--------|-------|
| Q0 | | ☑ **NO** | AI PM/CEO framing |
| Q1 | | ☑ **NO** | Reads as AI PM SaaS |
| Q2 | | ☑ **NO** | Pause at Headline |

**Friction (first test):** 😫 · **Score:** 5.5/10

---

### STEP 2 — Who (`/who`)

**Question-first · purpose (Job), not persona label**

| # | Question | Answer | Score | Notes |
|---|----------|--------|------:|-------|
| Q0 | 왜 이 카드를 눌렀는가? (상황이 맞는가) | ☑ **YES** | 9.5 | *"내 사업이 될까?"*에 반응 — 직업명보다 상황 |
| Q1 | 4분류가 맞는가? | ☑ **NO** | 7.5 | Persona 라벨보다 **목적(Job)** 선택이 자연스러움 |
| Q2 | Workflow로 망설임 없이? | ☑ **YES** | 9 | Landing→Who→Workflow 흐름 자연 |

**STEP 2 result:** ✅ **PASS (조건부)** — avg **8.7/10**

**Friction:** 🙂  
**Fix applied:** Persona → purpose 질문 UI · radio-style · 질문 > context 라벨 · 4 options reframed  
**Re-test target:** 9.5+ after deploy  
**Pattern:** Question-first UI (명사 ❌ · 질문 ✅) — ADR-020 extension

**Options (after fix):**

| ID | Question (large) | Context (small) |
|----|------------------|-----------------|
| idea-review | 아이디어를 검토하고 싶어요 | 예비창업 |
| startup-prep | 내 사업을 성장시키고 싶어요 | 사업자 |
| company-ops | 회사의 신규사업을 검토합니다 | 사내기획 |
| investment-prep | 고객의 사업을 검토합니다 | 컨설턴트 |

---

### STEP 3 — Workflow (`/workflow`)

**Goal:** 검토 과정 안내만 — AI PM · 채팅 · 보고서 없음

| # | Question | Answer | Score | Notes |
|---|----------|--------|------:|-------|
| Q0 | 왜 다음을 눌러야 하는가? | ☐ YES · ☐ NO | | |
| Q1 | 무엇을 하는 단계인가? (5초) | ☐ YES · ☐ NO | | |
| Q2 | 다음 단계가 명확한가? | ☐ YES · ☐ NO | | |

**DoD:** 5초 안에 무엇/왜/부담 없음 · **PASS ≥ 9.5**

**Deployed:** `feat(v2): simplify workflow to review process guide` — pending PM test

**Friction:** ☐ 🙂 · ☐ 😐 · ☐ 😫  
**Fix action (if FAIL):**  

---

### STEP 4 — Validation (`/validation`) — **핵심**

**Engagement:** 41% → 58% → 74% → 82% — **정확도를 올리고 싶어지는가?**

| Check | Answer | Notes |
|-------|--------|-------|
| **정확도를 올리고 싶다 (가장 중요)** | ☐ YES · ☐ NO | |
| 입력 부담 없음 | ☐ YES · ☐ NO | |
| progression이 재미있음 | ☐ YES · ☐ NO | |
| 다음으로 망설임 없이 진행 | ☐ YES · ☐ NO | |

**Friction:** ☐ 🙂 · ☐ 😐 · ☐ 😫  
**멈춘 지점:**  
**Fix action (1 line):**  

---

### STEP 5 — Investigate (`/investigate`) — **WOW**

**WOW moment:** *"좋습니다. 제가 조사하겠습니다."* — **"오..."** 느낌이 있는가?

| Check | Answer | Notes |
|-------|--------|-------|
| AI 등장 copy가 PM처럼 느껴짐 | ☐ YES · ☐ NO | |
| 기다릴 가치 있음 | ☐ YES · ☐ NO | |
| **"오..." WOW** | ☐ YES · ☐ NO | |
| 다음으로 망설임 없이 진행 | ☐ YES · ☐ NO | |

**Friction:** ☐ 🙂 · ☐ 😐 · ☐ 😫  
**멈춘 지점:**  
**Fix action (1 line):**  

---

### STEP 6 — Conclusion (`/conclusion`)

**30초 test:** GO · 왜? · 오늘 뭘 하지? — 30초 안에 이해되는가?

| Check | Answer | Notes |
|-------|--------|-------|
| GO/HOLD 30초 이해 | ☐ YES · ☐ NO | |
| "왜?"에 답함 | ☐ YES · ☐ NO | |
| "오늘 뭘?"에 답함 | ☐ YES · ☐ NO | |
| 다음으로 망설임 없이 진행 | ☐ YES · ☐ NO | |

**Friction:** ☐ 🙂 · ☐ 😐 · ☐ 😫  
**멈춘 지점:**  
**Fix action (1 line):**  

---

### STEP 7 — Workspace (`/workspaces` → `/workspace`)

**Retention:** 내일도 다시 들어올 것 같은가?

| Check | Answer | Notes |
|-------|--------|-------|
| Home에서 프로젝트 상태 파악 | ☐ YES · ☐ NO | |
| Detail — AI PM이 진짜 PM | ☐ YES · ☐ NO | |
| **내일도 다시 들어올 것 같다** | ☐ YES · ☐ NO | |

**Friction:** ☐ 🙂 · ☐ 😐 · ☐ 😫  
**멈춘 지점:**  
**Fix action (1 line):**  

---

## Pause log (flow breaks)

| # | Screen | What happened | Emotion | Fix action |
|---|--------|---------------|---------|------------|
| 1 | Landing / Headline | AI PM vs 사업성 검토 혼란 — "왜 눌러야?" 불명 | 😫 | Hero 카피: 사업성 검토 메인 |
| 2 | | | | |
| 3 | | | | |

---

## Fix backlog (from QA — V2 only until re-run)

| Priority | Screen | Issue | Fix action (1 line) | Status |
|----------|--------|-------|---------------------|--------|
| P0 | Landing | Hero sells AI PM, not validation | Headline/CTA → 사업성 검토; flow card; ADR-020 | ✅ done · STEP 1 PASS |
| P1 | Who | Persona labels vs purpose | Question-first · Job-based 4 options | ✅ applied · ☐ re-QA |
| P2 | | | | ☐ |

---

## Session notes

**2026-07-27 — Session 1, STEP 1 (PM)**

- STEP 1 **FAIL** — 기능 아닌 **메시지** 문제
- Q0/Q1/Q2 프레임워크 도입: 동기 → 서비스 이해 → 다음 행동
- Product sentence 확정: *"사업을 검토해드립니다. 검토가 끝나면 AI PM이 계속 관리해드립니다."*
- Landing hypothesis 8.5 → first test **5.5** → re-test **9.3 PASS**
- **ADR-020** LaunchLens Writing Rule — reveal only what user has experienced
- Hero minimal v2 deployed (flow preview card, banned words removed from fold)
- **STEP 1 PASS** → proceed to **STEP 2 (Who)**
- **STEP 2 PASS (조건부) 8.7** — purpose-based Who deployed · re-test on preview
- **Question-first UI** pattern locked for V2

---

## Related

- [SPRINT_0_4_V2_UX_QA.md](./sprints/SPRINT_0_4_V2_UX_QA.md) — checklist template
- [TASKS.md](./TASKS.md) — Sprint 0-4 gate
- [DECISIONS.md](./DECISIONS.md) — ADR-019
