# Sprint Q1 input trace

계약은 `reflection-output-11`이다. 출력 필드는 늘리지 않았다. 입력은 `founderChoice`, `founderSupplement`, `previousJudgment`, `previousHypotheses`, `previousVerification`으로 구분한다. 추가 설명이 없거나 미검증 주장일 때 양조장 후보 계획을 강제하지 않는다. 상태 문장만 반복하거나 선택 문장만 되풀이하면 저장하지 않는다. 코드는 검토 문장을 만들지 않는다. 화면, Production, 제품 2차 리뷰는 호출하지 않았다. 현재 판정은 FAIL이다. 이 기록은 CPO PASS가 아니다.

## 계약 비교

| 항목 | 이전 | 이번 |
|---|---|---|
| 계약 ID | `reflection-output-11` | `reflection-output-11` |
| 출력 필드 | 여섯 검토 필드 | 그대로 |
| 입력 | 선택과 추가 설명을 한 덩어리로 다룸 | `inputLedger`가 kind를 구분 |
| 빈 추가 설명 | 양조장 후보 계획을 지시 | 그 계획을 지시하지 않음 |
| 확정 주장 | 같은 양조장 후보 계획을 지시 | 주장과 증빙 확인을 지시. 사실로 쓰지 않음 |
| 보정 | 1회 | 1회. 실패 코드를 알릴 뿐 검토 문장을 넣지 않음 |

## 구조

모델 호출 전에 기존 60건을 포함한 62 passed다. 시각은 2026-10-30 17:38 KST다. 기록 고정 테스트를 더한 뒤 63 passed다.

| 사례 | 결과 |
|---|---|
| 추가 설명 없음, 검토가 선택과 판단의 관계를 적음 | PASS. 주입 응답. sections 저장 |
| 같은 문장을 두 사례가 반복 | PASS. 거절 |
| 확정 주장을 사실로 승격 | PASS. 저장 차단 |
| 없는 확정 양조장을 만들어 넣음 | PASS. 저장 차단 |
| changes → sections, 부모 불변, 자식 재조회, 중복 제출 | PASS |
| 사례 A 모델 | FAIL. sections null |
| 사례 B 모델 | FAIL. sections null |

## 사례 A와 사례 B

Run ID `q1-incremental-reflection-input-trace-2026-10-30`. 이전 run `q1-incremental-reflection-review-fields-2026-10-30`의 `finishedAt` `2026-10-30T08:09:20.215Z`는 유지됐다. Git SHA `aaf09bf638669c076152303669d580b03cb30856`. PR https://github.com/jyp-ai1/ai-startup-validation/pull/210. 시각 2026-10-30 17:39:41–17:40:03 KST. 모델 `gpt-4o-mini-2024-07-18`. 합계 prompt 12211, completion 2955, total 15166. 비용 NOT RUN. `productFollowUpInvoked` false. `responseFormat` `json_schema`. 호출 3회. 보정은 사례 B만 1회다.

선택은 둘 다 `체험 프로그램을 먼저 검증할 것`이다. 사례 A 추가 설명은 비어 있다. 사례 B 추가 설명은 합성 데이터이며, 양조장 한 곳과 체험 진행이 확정되었다는 주장과 계약서·입금 증빙이 없다는 문장이다.

사례 A는 최초 응답의 보정 목록이 비어 보정이 나가지 않았다. 저장 검증기는 그 응답을 거절했다. sections는 null이다. 부모 객체는 바뀌지 않았다.

| 항목 | 사례 A 최초 | 사례 B 보정 후 |
|---|---|---|
| 판단 | 선택 문장으로 판단을 바꿈 | 저장된 사업 구상 문장 |
| 가설 | `미확인`에 수요가 있을 것이라는 문장을 붙임 | `미확인`에 확정 주장 문장을 붙임 |
| inputConsidered | 선택 문장 | 확정 주장과 증빙이 없다는 문장 |
| impactAssessment | 실행 계획이 수정되었다 | `여전히 유효`와 `변화가 없다` |
| holdReason | 기존 판단을 변경해야 한다 | `여전히 유효`와 `새로운 정보가 없다` |
| 다음 검증 | 기존 수요·마케팅 문장. 선택 문장 없음 | 계약서·증빙과 체험 수요. 선택 문장 없음 |
| sections | null | null |

사례 B는 주장을 입력으로 적었으나, 영향 평가는 새 정보가 없다고 했다. 가설 문장은 `미확인`에서 바뀌었다. 주장을 확인된 사실이 아니라고 이유에 적지 않았다. 보정 뒤에도 상태 문장이 남았다.

두 사례의 판단 `inputConsidered`와 `holdReason`은 같은 문장이 아니다. 그래도 둘 다 저장 검증을 통과하지 못했다.

## 사례 A 보정

Run ID `q1-incremental-reflection-choice-repair-2026-10-30`. 이전 run은 위의 input-trace다. 그 `finishedAt` `2026-10-30T08:40:03.214Z`는 유지됐다. Git SHA `746e9e1c4538822eebeb9686d03da17f270a0f2a`. 시각 2026-10-30 17:43:56–17:44:08 KST. 합계 prompt 8192, completion 1682, total 9874. 비용 NOT RUN. `productFollowUpInvoked` false. 호출 2회. 보정 1회. 사례 B는 다시 호출하지 않았다.

보정 응답은 최초 응답과 바이트가 같다. 선택은 판단으로 올라갔고, `미확인` 가설은 성공 가능성이 높아진다는 문장으로 바뀌었으며, 다음 검증은 선택 문장을 포함하지 않는다. sections는 null이다.

```text
sufficiency_conflict:judgment
sufficiency_conflict:hypotheses
choice_promoted_to_judgment
next_verification_choice_absent
hypothesis_unconfirmed_replaced
```

3번째 호출은 하지 않았다.

## 제출 기준

| 기준 | 결과 |
|---|---|
| 기존 60개 테스트 | PASS |
| 사례 A 모델 품질 | FAIL |
| 사례 B 모델 품질 | FAIL |
| 주장과 검증 사실 구분 | 사례 B는 이유에서 주장을 표시하지 않음. FAIL |
| 유지·변경·유보 근거 | FAIL |
| 다음 검증 계획 실행 가능성 | FAIL |
| sections 저장 및 재조회 | 모델 결과 sections null. 주입된 정상 검토만 저장된다 |

원문: `sprint-q1-incremental-reflection-input-trace-recorded.json`, `sprint-q1-incremental-reflection-choice-repair-recorded.json`.
