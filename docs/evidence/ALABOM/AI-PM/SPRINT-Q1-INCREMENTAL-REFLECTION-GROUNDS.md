# Sprint Q1 grounds checker

배열 계약 재검증 뒤에 검증기를 고친 기록이다. 모델은 호출하지 않았다. 기존 네 run은 그대로다. 1차 검증 완료가 아니다. 기본값은 `quality-2`다. Production 잠금은 유지했다. 제품 2차 리뷰 경로는 호출하지 않았다.

## 고정한 실패

| 사례 | 오류 |
|---|---|
| 네 필드의 `grounds`가 같은 선택 문장 | `grounds_repeated_choice` |
| `미확인` 가설을 수요 존재 예상으로 변경 | `hypothesis_demand_ungrounded` |
| 추가 설명에 없는 예약 고객·가격·계약을 있는 정보로 사용 | `absent_input_invented` |
| 선택 계획을 `judgment`의 필요 판단으로 이동 | `choice_promoted_to_judgment` |

추가 설명에 예약 고객, 가격, 계약, 확정된 양조장이 없다고 되어 있으면 각 `grounds`에 그 말이 있어야 한다. 없으면 `grounds_missing_supplement`다. `founderAnswer`는 선택 문장 또는 추가 설명의 연속된 말이어야 한다. 새로 만든 판단 문장은 `follow_up_output_founder_answer_untraced`다.

빈 오류 목록은 이 규칙의 통과다. 증분 반영 품질 통과가 아니다.

## 이전 배열 호출을 다시 계산

run `q1-incremental-reflection-array-2026-10-29`의 저장 JSON은 바꾸지 않았다. 새 검증기 결과는 아래다.

```text
follow_up_output_founder_answer_untraced:judgment
grounds_missing_supplement:judgment
follow_up_output_founder_answer_untraced:hypotheses
grounds_missing_supplement:hypotheses
follow_up_output_founder_answer_untraced:nextVerification
grounds_missing_supplement:nextVerification
follow_up_output_founder_answer_untraced:nextQuestion
grounds_missing_supplement:nextQuestion
grounds_repeated_choice
choice_promoted_to_judgment
hypothesis_demand_ungrounded
```

이 계산은 저장본을 읽은 뒤 `followUpOutputContractErrors`로 했다. 새 모델 호출이 아니다.

## 테스트

모델 호출 없이 `ai-pm-review.test.ts`, `ai-pm-quality-compare.test.ts`, `ai-pm-quality-scenarios.test.ts`를 실행했다. 45 passed. 음성 네 사례는 위 오류를 낸다. 가설을 `미확인`으로 두고 추가 설명의 없음을 근거로 적은 응답은 오류 목록이 비어 있다. 그 빈 목록은 스키마 통과다.

Preview 스크립트의 run id는 `q1-incremental-reflection-array-2026-10-29` 그대로다. 그 객체는 `RECORDED`라 같은 스크립트는 다시 호출하지 않는다. 반환 계약 이름은 `reflection-output-3`이다. 이미 보낸 배열 요청 파일은 `reflection-output-2`로 남아 있다.

## 하지 않은 관문

| 관문 | 상태 |
|---|---|
| 제품 요청 구조 | PASS. SHA `eed29780cf9b43f2f580bb003bd7c0142c053a77` |
| 증분 반영 | FAIL. 검증기와 음성 테스트만 고쳤고 새 모델 호출은 하지 않음 |
| 2차 품질 | NOT RUN |
| 저장·복원 | NOT RUN |
| 화면 Q9·Q10 | BLOCKED. 2026-10-29 18:07 KST |
| Production | 잠금 유지 |
| 기본 프롬프트 | `quality-2` |
| 제품 2차 리뷰 | 호출하지 않음 |
