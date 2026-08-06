# S16 — CEO Walkthrough Guide

**상태:** ⏸ **HOLD** — RC package submitted; CEO Gate opens only when CPO opens it  
**CPO:** Implementation + Internal QA ✅ **PASS** · CEO Walkthrough still **HOLD**  
**목적:** Journey만 확인합니다. 기능 테스트 · 점수 정확도 · AI 깊이 = 범위 밖.

**시간:** 약 8–12분  
**URL:** https://ai-startup-validation-tau.vercel.app  

**동결:** Walkthrough 중 **제품 코드 수정 금지**. 피드백은 종료 후 Expected / Deferred / Bug로만 분류  
→ `docs/sprints/S16_KNOWN_ISSUES.md`

체크할 때 **화면이 막히거나 「다음에 뭘」이 없으면** 해당 단계에 ✗ 표시해 주세요.

---

## Production Trace

| Item | Value |
|------|-------|
| Production URL | https://ai-startup-validation-tau.vercel.app |
| Production SHA | `a13accf30776fb94061fcb7b30e255a50fd66222` |
| Deploy Time | `2026-08-06T01:33:58.524Z` |
| Build | PASS |
| QA | PASS |

Source: `GET /api/build-info` (live at RC package submit).

---

## 시작 전

1. 브라우저 시크릿 창 권장 (쿠키 모달만 「분석 수락」 또는 「거부」)
2. 언어: **KO**
3. Journey 관점: **막힘 없이 다음 행동이 보이는가?**

---

## Demo Path

Demo sample → input → Shared Understanding → Analysis → Hero

### 1) Demo 진입

1. 접속 → **Demo Workspace** 또는 `/demo/start`
2. 샘플 사업 또는 짧은 사업으로 시작

### 2) Input → Shared Understanding

1. AI가 **사업 / 고객 / 문제**를 요약하는지 확인
2. **「맞습니까?」** 확인 게이트가 **첫 질문보다 먼저** 나오는지 확인
3. **「✓ 맞습니다」** 후 첫 질문으로 이어지는지 확인

**PASS 조건**

- [ ] Shared Understanding이 첫 ask보다 앞
- [ ] 확인 없이 질문 입력창만 단독으로 뜨지 않음
- [ ] 「다음에 뭘」이 화면에서 보임

### 3) Analysis → Hero

검토 시작 후 Analysis에서:

```text
현재 판단
  ↓
근거
  ↓
지금 해야 할 일  (Hero CTA 1개)
```

**PASS 조건**

- [ ] 판단 → 근거 → 다음 행동 순서
- [ ] Hero CTA **1개**
- [ ] 점수가 주인공이 아님

---

## Login Path

Login → new project → Workspace → first question

1. **Login** → Google
2. **새 프로젝트** — 이름만 입력 · 사업 설명 **비움**
3. 생성 → Workspace

**PASS 조건**

- [ ] 「8자 이상」 문구 **없음**
- [ ] 빈 프로젝트에서도 막히지 않음 (모름 인정 seed 또는 문서 없이 시작)
- [ ] Shared Understanding / Trust 이후 **첫 질문**까지 도달
- [ ] 「다음에 뭘」이 보임

---

## Expected Flow (Upload PDF)

Upload PDF → Trust → Workspace → Loop

1. Demo 또는 Workspace에서 PDF(또는 placeholder) 업로드
2. Trust Block 확인
3. Workspace → Shared Understanding → Loop 질문

**PASS 조건**

- [ ] 사업명이 파일명(`plan.pdf` 등)이 **아님**
- [ ] PDF를 읽었다고 **과장하지 않음** (못 읽으면 Trust에 명시)
- [ ] Trust → Workspace → Loop로 **dead-end 없음**

---

## Analysis only

판단 → 근거 → 다음 행동

스크롤 없이(또는 첫 화면에서):

| 순서 | 확인 |
|------|------|
| 1 | **현재 판단**이 보임 |
| 2 | **근거** (≤3)가 보임 |
| 3 | **지금 해야 할 일** + Hero 버튼 **1개** |
| 4 | 점수는 참고(부차) |

**PASS 조건**

- [ ] 위 순서
- [ ] 「지금 뭘 해야 하는지」 ~3초 안에 분명
- [ ] 점수-only 종료 **아님**

---

## Check List (Journey)

| # | Journey | PASS |
|---|---------|------|
| 1 | Demo sample → input → Shared Understanding → Analysis → Hero | [ ] |
| 2 | Upload PDF → Trust → Workspace → Loop | [ ] |
| 3 | Login → new project → Workspace → first question | [ ] |
| 4 | Analysis: 판단 → 근거 → 다음 행동 | [ ] |
| 5 | 전 구간 dead-end 없음 · 「다음에 뭘」 항상 보임 | [ ] |

---

## 한줄 피드백 (선택)

| 느낌 | 메모 |
|------|------|
| Journey가 막히지 않았는가? | |
| Shared Understanding → 질문이 납득되는가? | |
| Analysis에서 「지금 뭘」이 ~3초 안에 분명한가? | |

상세 분류 → `docs/sprints/S16_KNOWN_ISSUES.md`

---

## Gate reminder

```text
Implementation ✅ PASS (CPO)
Internal QA ✅ PASS (CPO)
RC package ✅ submitted
CEO Walkthrough ⏸ HOLD until CPO opens gate
```
