# Founder Journey — Strategy Revalidation

**Status:** 📋 CPO SWITCHED to review-centric · 구현 0  
**Next:** `docs/sprints/REVIEW_CENTRIC_JOURNEY_STRATEGY_VALIDATION.md`  
**Production SHA:** `1394a8d`  
**Not:** UI 개선 Sprint · 질문 루프 최적화 Sprint  
**KPI forbidden:** 질문 수 · Gap 수 · 정확도 · E2E PASS as UX PASS  
**CEO test:** CLOSED

> 정확한 AI를 만드는 것과, 사람이 쉽게 대화할 수 있는 제품을 만드는 것은 별개의 Acceptance다.  
> 이번 목표는 “AI PM 대화를 더 정확하게”가 아니라 **Founder가 10~15분 안에 자기 사업의 핵심 문제와 사업성 판단을 얻는 경험**이다.

## Current assumption (may be wrong)

```text
Founder가 사업 정보를 입력
 → AI PM이 부족한 정보를 질문
 → 답변을 축적
 → 사업성을 판단
```

Alternative that may be more natural:

```text
내 사업을 먼저 전체적으로 설명
 → AI가 이해한 것을 구조화
 → 빠진 핵심만 질문
 → 중간중간 사업 판단을 보여줌
```

V3 질문 엔진 개선이 최종 전략이라는 보장은 없다. Strategy Problem이 나오면 기존 전략을 폐기/수정할 수 있다. V3 SoT는 기술 안전장치일 뿐, 제품 전략이 틀렸다면 바꿀 수 있다.

## Founder questions (journey, not components)

| | Question | If NO |
|-|----------|-------|
| A | 무엇을 입력해야 하는지 아는가? | Journey 변경 가능 |
| B | AI가 무엇을 이해했는지 아는가? | Journey 변경 가능 |
| C | 왜 지금 이 질문을 받는지 이해하는가? | Journey 변경 가능 |
| D | 내가 답한 것이 어떻게 사업 검토에 반영됐는지 아는가? | Journey 변경 가능 |
| E | 언제 “충분히 검토됐다”고 느끼는가? | Journey 변경 가능 |
| F | 결과가 실제 사업 의사결정에 도움이 되는가? | Journey 변경 가능 |

## Judgment (Value > Accuracy > UX polish)

| Area | Question |
|------|----------|
| Clarity | 지금 무엇을 하고 있는지 이해되는가 |
| Progress | 내가 실제로 사업 검토를 진행하고 있다고 느끼는가 |
| Trust | AI가 내 말을 정확히 이해했다고 믿을 수 있는가 |
| Effort | 답변하는 것이 귀찮거나 반복적이지 않은가 |
| Value | 계속 진행할 이유가 있는가 |

## Forbidden

- 바로 UI 컴포넌트 / 버튼 위치 / 질문 문구만 변경
- 기존 V3 질문 엔진 위 임시 UX 패치
- CEO 발견 문제 하나씩 개별 patch
- E2E PASS = UX PASS
- 기존 구조가 맞다는 전제에서 UX 개선
- J1/J2/J3 PASS 중간 보고

## First work (this PR)

Production `1394a8d`에서 Founder Journey를 따라가며 각 단계에 기록한다.

```text
Founder 행동
AI가 보여준 것
Founder가 예상할 것
실제 화면
혼란 발생 여부
다음 행동이 명확한가
사업 검토 가치가 느껴지는가
```

분류:

| Tag | Meaning |
|-----|---------|
| 🔴 Product Problem | 제품이 해야 할 일이 아님 / 빠진 가치 |
| 🟡 UX Problem | 가치는 있는데 길을 잃음 |
| 🔵 AI Reasoning Problem | 이해/판단이 틀림 |
| 🟢 UI Implementation Problem | 같은 상태에서 화면만 깨짐 |
| ⚫ Strategy Problem | 질문 중심 Journey 가정이 틀림 수 있음 |

## Decision path

```text
Production 실제 사용
 → Founder 행동 관찰
 → 문제 증거
 → 문제 분류
 → 전략 가설
 → 대안 Journey
 → 작은 검증
 → 채택 / 폐기
```

CPO decides **유지 / 전환** before any UX implementation. CEO does not test until CPO opens one final user test.

Evidence: `docs/evidence/ALABOM/FOUNDER_JOURNEY_STRATEGY_REVALIDATION.md`

## This slice

Production walk on `1394a8d` is recorded. CPO decides **유지 / 전환** before any implementation.
