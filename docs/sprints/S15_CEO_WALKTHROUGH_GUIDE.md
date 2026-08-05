# S15 — CEO Walkthrough Guide

**상태:** 🟢 **APPROVED** — Walkthrough open (CPO Final Review ✅ PASS)  
**목적:** 아래 **두 질문만** 확인합니다 (점수 정확도 · AI 깊이 = 이번 게이트 범위 밖).

1. 사용자가 **AI가 무엇을 이해했는지**, 그리고 **왜 다음 질문인지** 알 수 있는가?
2. 최종 화면에서 **「지금 뭘 해야 하는지」**가 약 **3초** 안에 분명한가?

**시간:** 약 5–8분  
**URL:** https://ai-startup-validation-tau.vercel.app  

**동결:** Walkthrough 중 **제품 코드 수정 금지**. 피드백은 종료 후 P0 / P1 / Backlog로만 분류  
→ `docs/sprints/S15_CEO_WALKTHROUGH_FEEDBACK.md`

체크할 때 **화면이 막히거나 설명이 없으면** 해당 단계에 ✗ 표시해 주세요.

---

## 시작 전

1. 브라우저 시크릿 창 권장 (쿠키 모달만 「분석 수락」 또는 「거부」)
2. 언어: **KO**

---

## 시나리오 A — Demo (로그인 없이)

### 1) Demo 진입

1. 접속 → **Demo Workspace** 또는 `/demo/start`
2. **「내 사업 문서로 체험하기」** 선택

### 2) Upload / Trust

1. PDF 업로드 **또는** 아래처럼 붙여넣기:

```text
# plan.pdf

PDF 본문은 아직 추출되지 않았습니다. Business·Customer는 직접 확인이 필요합니다.
```

2. **「AI Read 시작」**

**PASS 조건**

- [ ] 사업명이 `plan.pdf`가 **아님**
- [ ] 「읽어보니…」 같은 과장 읽기 **없음**
- [ ] Trust 안내 후 질문/Loop로 이어짐  
  (예: 본문을 아직 읽을 수 없음 → 같이 정리)

### 3) 질문 답변 → 검토

1. AI 질문에 **짧게** 답변 (고객 / 문제)
2. **「검토 시작」**이 보이면 클릭  
   안 되면: **왜 아직 안 되는지** 이유가 화면에 보여야 함

**PASS 조건**

- [ ] 버튼이 무반응이 아님 (시작 **또는** 이유)
- [ ] AI가 무엇을 이해했는지 / 왜 이 질문인지 납득 가능

### 4) Analysis 화면

스크롤 없이(또는 첫 화면에서) 아래 순서인지 확인:

```text
현재 판단
  ↓
근거
  ↓
지금 해야 할 일  (+ 버튼 1개)
  ↓
(참고 점수 — 부차)
```

**PASS 조건**

- [ ] 위 순서로 이해 가능
- [ ] Hero CTA 버튼이 **정확히 1개**
- [ ] **「지금 뭘 해야 하는지」**가 ~3초 안에 분명
- [ ] 점수가 주인공이 아님 (참고 · 정확도 채점 불필요)

---

## 시나리오 B — 신규 프로젝트 (로그인 필요)

1. **Login** → Google
2. **새 프로젝트**
3. 이름만 입력 · **사업 설명은 비움**
4. 생성

**PASS 조건**

- [ ] 「8자 이상」 문구 **없음**
- [ ] 생성 실패 **없음**
- [ ] Workspace에서 첫 질문(또는 함께 정리)으로 이어짐
- [ ] AI가 이해한 것 / 왜 다음 질문인지 납득 가능

---

## 한줄 피드백 (선택)

| 느낌 | 메모 |
|------|------|
| AI가 이해한 것 / 왜 다음 질문인지 알겠는가? | |
| 최종 화면에서 「지금 뭘」이 ~3초 안에 분명한가? | |
| 막고 싶은 화면이 있었는가? | |

상세 분류는 Walkthrough **종료 후** → `S15_CEO_WALKTHROUGH_FEEDBACK.md` (P0 / P1 / Backlog)

---

## CTO 참고 (CEO 무시해도 됨)

| 항목 | 값 |
|------|-----|
| Production | https://ai-startup-validation-tau.vercel.app |
| SHA (tip) | `827d189` — includes S15 P0 `65a5972` |
| CPO Final | ✅ PASS |
| Walkthrough | 🟢 APPROVED / open — code freeze during session |
