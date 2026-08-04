# S15 UX Specification (P0)

**Status:** Submitted for CPO Review — **implementation frozen**  
**Theme:** Decision Fatigue → Guided Validation  
**North star:** AI가 **다음 행동 하나**를 결정해주는 제품  
**Source backlog:** `docs/sprints/S15_BACKLOG.md` (Scope Freeze)  
**Production baseline:** https://ai-startup-validation-tau.vercel.app

> CEO Walkthrough #1 core finding: not “too few features” — **“무엇을 해야 하는지 모르겠다.”**

---

## Spec rules

Each P0 below is one page of product intent.

| Field | Meaning |
|-------|---------|
| **Current** | What CEO/Founder experiences today |
| **Expected** | What they must experience after S15 |
| **Acceptance** | How CPO/CEO knows it is done (observable, not code) |

**Out of scope (do not expand):** new AI model · new score system · new cards/tabs · market/competitor engine expansion.

---

## P0-1 — Demo / Workspace Upload 복구

### Current

```text
파일 선택
  ↓
업로드 실패 / 반영 없음
  ↓
Loop 진입 불가
```

CEO: “파일 업로드 안됨”

### Expected

```text
PDF (또는 허용 문서) 선택
  ↓
Placeholder 허용 시 Trust Block이 “읽지 못함”을 명시
  ↓
실제 본문 추출 시 Readable → Workspace 반영
  ↓
AI PM Loop 정상 진입
```

### Acceptance

- Demo/Workspace에서 PDF 업로드 후 **문서 컨텍스트가 화면에 나타난다.**
- Placeholder 문서는 **허위 “읽음” 없이** 막히거나 Trust 메시지가 보인다.
- Readable 문서면 **Loop 첫 질문까지 진입**한다.
- CEO가 Upload 경로로 Walkthrough를 다시 했을 때 **막히지 않는다.**

---

## P0-2 — 「검토 시작」무반응 금지

### Current

```text
AI 분석 / 대화 진행
  ↓
「검토 시작」
  ↓
클릭해도 반응 없음 (서비스가 멈춘 느낌)
```

### Expected

```text
「검토 시작」
  ↓
[ A ] 활성 → Review 실행 → Analysis 표시
  또는
[ B ] 비활성 → 이유 1줄 (사용자 언어: 무엇이 부족한지)
```

무반응 · 침묵 금지.

### Acceptance

- 버튼이 **켜져 있으면** 1회 클릭으로 Review/Analysis로 진전한다.
- 버튼이 **꺼져 있으면** “왜 아직 시작 못 하는지”가 **한 문장**으로 보인다.
- CEO가 “서비스가 멈췄다”고 느끼지 않는다.

---

## P0-3 — 신규 프로젝트 = 빈 Workspace 먼저

### Current

```text
새 프로젝트
  ↓
사업 설명/문서 8자 이상 필수
  ↓
미입력 시 생성 거부
  (“사업 설명 또는 문서 내용을 8자 이상…”)
```

신규 Founder가 입구에서 막힘.

### Expected

```text
새 프로젝트 (이름 + 검토 유형)
  ↓
빈 Workspace 즉시 생성
  ↓
AI가 질문을 시작 (문서/설명은 이후)
```

설명/문서는 **생성 조건이 아니라** Workspace 안의 다음 단계.

### Acceptance

- 로그인 사용자가 **설명 0자**로도 프로젝트를 만들 수 있다.
- 생성 직후 Workspace에 들어가고 **AI 질문이 보인다** (또는 “문서/답을 기다리는” 명확한 다음 한 걸음).
- 8자 강요 에러로 생성이 막히지 않는다.

---

## P0-4 — Hero Action (다음 행동 1개)

### Current

```text
분석 결과
  ↓
추천 / 인터뷰 계획 / 경쟁사 / 다음 추천 / …
  ↓
액션 5~6개 → “그래서 지금 뭘 하지?”
```

Decision Fatigue.

### Expected

```text
AI 판단 (한 줄)
  ↓
지금 해야 할 일 — Hero Action 1개 (단일 CTA)
  ↓
왜? (짧은 근거)
  ↓
나머지 추천은 「더보기」로 접힘
```

완료하면 그때 다음 Hero를 생성.

### Acceptance

- Analysis 화면에서 CEO가 **3초 안에** “지금 할 일”을 가리킬 수 있다.
- 동시에 보이는 1차 CTA는 **하나**다.
- 보조 액션은 기본 숨김(접힘)이다.

---

## P0-5 — 점수보다 근거 → 판단 → 행동

### Current

```text
74점 (또는 유사 스코어)가 먼저
  ↓
“왜 이 점수인가?”에 답이 없음
```

### Expected

```text
현재 판단 (상태)
  ↓
근거 최대 3개
  ↓
그래서 다음 행동 (= Hero Action, P0-4와 동일 Presenter)
```

점수는 **Supporting** (작게 / 접힘 / 보조). 주인공이 아님.

### Acceptance

- 첫 시선이 숫자 스코어가 아니라 **판단 + 근거**다.
- “왜?”에 답하는 근거가 **최대 3개** 보인다.
- 그 다음 줄에 **Hero Action**이 이어진다 (P0-4와 한 흐름).

---

## P1 (Spec preview only — implement after P0)

### Guided Step UX

**Current:** 완료율/점수 중심.  
**Expected:** STEP 1 · 2 · 3가 항상 보이고 “지금 어디 / 다음에 뭐”.  
**Acceptance:** CEO가 지금 Step을 말로 말할 수 있다.

*(상세 Spec은 P0 CPO PASS 후 작성.)*

---

## Carry — Memory bag sync (`problem`)

S14 Confirmed Issue. S15에서 P0-2 Review와 함께 수정.

**Current:** turn에는 `problem_definition`이 있어도 bag에 `problem` key가 늦을 수 있음.  
**Expected:** confirm된 turn의 Fact는 apply 직후 bag에 존재.  
**Acceptance:** Live Memory trail에 `problem` key가 turn과 함께 나타난다.

---

## Proposed implementation order (after CPO Spec PASS)

> 코드 착수는 **본 Spec CPO Review PASS 후**만.

```text
1. P0-3 신규 프로젝트 (빈 Workspace)
2. P0-1 Upload 복구
3. P0-2 Review Start (+ Memory sync)
4. P0-4 Hero Action
5. P0-5 근거-first Presenter (P0-4와 동일 표면)
6. P1 Guided Step (여유 시)
```

*(CPO가 순서를 Upload 우선으로 재배치하면 `S15_PROGRESS.md`에 반영.)*

---

## CTO posture until CPO Review

- **No feature implementation**
- Await CPO cut: “이건 아니다” 제거 후 Scope lock
- Then implement only what remains in this Spec

---

*Submitted for CPO UX Review — S15.*
