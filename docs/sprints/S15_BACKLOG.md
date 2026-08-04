# S15 Backlog — CEO Walkthrough #1

**Source:** CEO Product Walkthrough after S14 Production Release  
**Production:** https://ai-startup-validation-tau.vercel.app (`b255669`)  
**Status:** **SCOPE FROZEN** (CPO 2026-08-04) — no scope expansion  
**Next:** `docs/sprints/S15_UX_SPEC.md` CPO Review → then implementation  
**Implementation:** frozen until UX Spec PASS  
**North star (CPO):** Decision Fatigue 제거 — 「지금 가장 먼저 해야 할 한 가지」(Hero Action)

---

## Mission hypothesis

S14 proved Engine → Presenter wiring.

CEO experience shows the product still feels like **“AI showing many things”**, not an **AI Strategy Consultant** who picks one next move.

S15 priority order:

1. Unblock Founder journey (P0 functional blockers)
2. Collapse post-Analysis UI to **one Hero Action**
3. Replace score-first with **근거 → 다음 행동**
4. Then stage guidance (P1)

---

## P0

### P0-1 — Demo Upload 동작 안 함

**Issue:** Demo(또는 워크스페이스) 파일 업로드가 실패한다.

**CEO Observation:**  
> 파일 업로드 안됨

**Expected UX:**  
문서(PDF/DOCX 등) 선택 → 업로드/파싱 성공 → Workspace에 문서 반영 → AI PM Loop 시작 가능.

**Current UX:**  
업로드 시도 후 문서가 반영되지 않거나 실패한다. CEO 입장에서 검증 시작이 막힌다.

**Evidence:**  
CEO Walkthrough #1 (Production). Severity: **P0 기능 버그**.

---

### P0-2 — Review「검토 시작」버튼 동작 안 함

**Issue:** 마지막 AI 분석 흐름에서「검토 시작」이 눌리지 않거나 진전이 없다.

**CEO Observation:**  
> 마지막 AI 분석에서 검토 시작이 안 눌림

**Expected UX:**  
Evidence gap이 닫히면 `canStart=true` → 탭/클릭 → Review 실행 → Analysis Presenter 표시.  
막혀 있으면 **왜 막혔는지**가 사용자 언어 한 줄로 보인다.

**Current UX:**  
버튼이 비활성/무반응이거나 Review가 진행되지 않아 **서비스가 멈춘 것처럼** 느낀다.  
(Review Gate contract vs binding — 원인 기술 분류는 Scope 확정 후.)

**Evidence:**  
CEO Walkthrough #1 (Production). Severity: **P0**.  
Related Accepted Risk (S14): ConversationMemory bag sync (`problem`) — S15에서 Gate/버튼과 함께 재검증.

---

### P0-3 — 신규 프로젝트 생성 불가

**Issue:** 로그인 후 새 프로젝트 생성이 사업 설명/문서 8자 이상 선행 조건에 막힌다.

**CEO Observation:**  
메시지: `사업 설명 또는 문서 내용을 8자 이상 입력해 주세요.`  
새 프로젝트조차 만들 수 없다.

**Expected UX:**

```text
새 프로젝트
  ↓
빈 Workspace 생성
  ↓
AI가 질문 시작 (문서/설명은 이후)
```

**Current UX:**

```text
새 프로젝트
  ↓
사업설명/문서 미입력 → 생성 거부
```

신규 사용자 onboarding이 막힌다. Flow 설계 오류.

**Evidence:**  
CEO Walkthrough #1 (Production). Severity: **P0**.

---

### P0-4 — AI 분석 결과 Hero Action 하나로 단순화

**Issue:** 분석 이후 Action이 다수 노출되어 Decision Fatigue를 유발한다.

**CEO Observation:**  
> 액션 기능이 너무 많음  
→ “그래서 지금 뭘 해야 하지?”

**Expected UX:**

```text
AI 판단
  ↓
지금 가장 먼저 해야 할 일 (Hero Action) — 단일 CTA
  ↓
왜? (짧은 근거)
  ↓
나머지 추천/보조 액션은 접기
```

**Current UX:**

```text
AI 분석 → 추천 → 이유 → 인터뷰 계획 → 경쟁사 분석 → 다음 추천 작업 → …
```

Presenter가 Action A·B·C·D를 동시에 노출한다. AI는 “생각”을 많이 보여주고, 사용자는 “행동”이 보이지 않는다.

**Evidence:**  
CEO Walkthrough #1. CPO: **P0 제품 경험**. S15 최우선 제품 목표 = Decision Fatigue 제거.

---

### P0-5 — 점수보다 근거 중심으로 재구성

**Issue:** 점수(예: 74점)만 강조되고 “왜 이 점수인가?”가 없다.

**CEO Observation:**  
> 왜 이 점수인가?

**Expected UX:**

```text
현재 상태
  ↓
근거 3개
  ↓
그래서 다음 행동 (Hero)
```

점수는 보조 메타데이터.

**Current UX:**  
점수 숫자 중심. 근거·다음 행동보다 스코어가 먼저 읽힌다.

**Evidence:**  
CEO Walkthrough #1. Severity: **P0** (Experience). P0-4와 한 Presenter 재설계로 묶을 수 있음.

---

## P1

### P1-1 — 단계별 진행 UX

**Issue:** 「AI와 같이 검증한다」는 제품 약속에 단계 안내가 부족하다.

**CEO Observation:**  
> 단계별 안내가 필요하다.

**Expected UX:**

```text
STEP1 → STEP2 → STEP3
```

가 항상 보이고, 지금 어디인지·다음에 뭐가 오는지 안다.  
“분석해주는 도구”가 아니라 “같이 검증하는 파트너” 톤.

**Current UX:**  
단계 골격이 약하거나 점수/액션 나열에 묻힌다.

**Evidence:**  
CEO Walkthrough #1. Severity: **P1**. P0 Hero Action·언블록 이후.

---

## Previously accepted (carry-in)

### S14 Confirmed Issue — ConversationMemory bag sync (`problem`)

**Issue:** `problem_definition` turn 이후 sessionStorage ConversationMemory bag에 `problem` key가 즉시 반영되지 않을 수 있음 (overwrite 아님).

**CEO Observation:** (직접 발화 아님) Review Gate/Analysis와의 결합으로 P0-2 재검증 시 확인.

**Expected UX:** 확인된 Loop turn의 Fact는 apply 직후 Memory bag에 존재.

**Current UX:** Review-time rebuild는 Engine에 `problem=confirmed`를 줄 수 있으나 bag key 지연 가능 — S14에서 Confirmed Issue로 분류.

**Evidence:**  
`docs/evidence/S14/REPORT.md` Classification · Live/Prod smoke trail.

---

## Proposed S15 sequencing (CPO lock 대기)

| Order | ID | Theme |
|------:|----|--------|
| 1 | P0-3 | 신규 프로젝트: 빈 Workspace 먼저 |
| 2 | P0-1 | Demo Upload |
| 3 | P0-2 | 검토 시작 (+ bag sync 재검증) |
| 4 | P0-4 + P0-5 | Hero Action + 근거-first Presenter |
| 5 | P1-1 | 단계별 진행 UX |

**Out of scope until CPO Scope lock:** 새 Decision family · LLM · Landing redesign · Score 고도화 as primary UX.

---

## CTO posture

- **Do not implement** until CPO confirms S15 Scope.
- Collect further CEO feedback into this file (append Observations / Evidence).
- S15 starts only after CPO Scope document.

---

*Last updated from CEO Walkthrough #1 — CPO product framing (Decision Fatigue).*
