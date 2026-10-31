# Sprint Q1 decision consistency

계약은 `reflection-output-11`이다. 출력 필드는 늘리지 않았다. 구조 테스트와 모델 추론은 따로 판정한다. 이 기록은 CPO PASS가 아니다.

## 실패 분류

| 코드 | 의미 |
|---|---|
| input_echo_only | 선택 문장을 검토 없이 복사 |
| reason_insufficient / retention_sufficiency_missing | 유지하면서 근거가 부족하다는 말이 reason에 없음 |
| retention_evidence_missing | 아직 없는 증거가 reason에 없음 |
| retention_hold_missing | 문장을 유지하면서 유지 이유가 reason에 없음 |
| retention_effect_missing | reason이 판단이나 가설에 미치는 영향을 말하지 않음 |
| priority_plan_unfocused | 온라인 마케팅을 체험 확인과 같은 순서로 붙임 |

## 구조

모델 호출 전에 기존 70건을 포함한 71 passed다. 시각은 2026-10-30 19:29 KST다. 이 기록 고정 테스트를 더한 뒤 72 passed다. 합성 데이터로 두 번째 답변을 이전 AI 분석 위에 누적하는 구조 검사는 PASS다. 그 검사는 모델 호출이 아니다. 판단 문장을 유지한 채 decision만 changed로 두면 저장되지 않는다. 마케팅을 체험과 같이 붙이거나, 기존 마케팅 과제를 빼면 저장되지 않는다.

| 검사 | 결과 |
|---|---|
| 문장은 같고 decision만 바꾸면 저장 차단 | PASS |
| 마케팅을 체험과 같은 순서로 붙이면 저장 차단 | PASS |
| 기존 마케팅 과제를 빼면 저장 차단 | PASS |
| 선택 문장만 복사하면 저장 차단 | PASS |
| 미검증 주장을 사실로 쓰면 저장 차단 | PASS |
| 두 번째 합성 답변이 이전 분석 위에 누적 | PASS. 모델 호출 없음 |
| 잘못된 추론은 sections null | PASS |
| 부모 분석 객체 불변 | PASS |

## 모델 호출

Run ID `q1-incremental-reflection-decision-2026-10-30`. 이전 run `q1-incremental-reflection-unified-2026-10-30`의 `finishedAt` `2026-10-30T10:06:57.047Z`는 유지됐다. Git SHA `710719abc418b9677e2362c5e9c871e5f4463322`. PR https://github.com/jyp-ai1/ai-startup-validation/pull/210. 시각 2026-10-30 19:30:13–19:30:44 KST. 모델 `gpt-4o-mini-2024-07-18`. 합계 prompt 18032, completion 3046, total 21078. 호출별 prompt/completion/total은 3844/748/4592, 5041/748/5789, 3939/772/4711, 5208/778/5986이다. 비용 NOT RUN. `productFollowUpInvoked` false. `responseFormat` `json_schema`. 호출 4회. 사례마다 보정 1회. 3번째 호출은 없다. 사례 A 보정은 최초 응답과 바이트가 같다. 사례 B 보정은 다르다. 보정 뒤에도 오류가 남아 모델 추론은 FAIL이다. sections는 null이다.

선택은 둘 다 `체험 프로그램을 먼저 검증할 것`이다. 사례 A 추가 설명은 비어 있다. 사례 B 추가 설명은 합성 데이터이며, 양조장 한 곳과 체험 진행이 확정되었다는 주장과 계약서·입금 증빙이 없다는 문장이다.

## 사례 A

추가 설명은 없다. 보정은 최초 응답과 같은 JSON이다. 판단 문장은 저장된 문장과 같다. decision은 retained, sufficiency는 insufficient, evidenceStatus는 unconfirmed다. 가설은 `미확인`이고 decision은 retained다. 다음 검증은 `체험 프로그램을 먼저 검증할 것 후 체험 프로그램의 수요 검증 및 온라인 마케팅 효과 검증이 필요하다.` decision은 changed, sufficiency는 insufficient다. 마케팅 과제는 남았으나 `및`으로 체험 확인과 같은 순서다. 다음 질문은 `체험 프로그램 참여 의향은 얼마나 되나요?` previous는 저장된 질문과 같다. `inputConsidered`는 선택 문장 그대로다. 판단 reason은 유지와 방향성이 명확하다를 적고, 근거가 부족하다는 말과 아직 없는 증거는 없다. 가설 impact는 선택이 검증 순서를 바꾼다고 적었다. 가설 reason은 추가 정보가 필요하다고 적고 근거 부족은 없다. sections는 null이다.

```text
reason_insufficient:judgment
retention_sufficiency_missing:judgment
retention_evidence_missing:judgment
input_echo_only:judgment
reason_insufficient:hypotheses
retention_sufficiency_missing:hypotheses
input_echo_only:hypotheses
priority_plan_unfocused
```

| 항목 | 보정 후 |
|---|---|
| 입력 해석 | 선택을 판단 문장으로 올리지는 않았다. inputConsidered는 선택 문장 그대로다 |
| 판단 decision | retained. 문장과 decision은 같다. reason은 방향성이 명확하다고 적었다. 근거 부족과 필요한 증거는 reason에 없다. sufficiency는 insufficient |
| 가설 decision | retained. 문장은 `미확인`. impact는 선택이 검증 순서를 바꾼다고 적었다. reason의 근거 부족은 없다 |
| 검증 decision | changed. 선택 문장, 수요 검증, 온라인 마케팅이 한 문장에 있다. 마케팅은 `및`으로 같은 순서다. sufficiency는 insufficient |
| 다음 질문 | 체험 참여 의향을 묻는다. previous는 저장 질문과 같다 |
| 저장 | sections null. 부모 객체 불변. 보정은 최초 응답과 같다 |
| 잔여 오류 | 위 8개 |

판단 decision은 retained, 가설 decision은 retained, 검증 decision은 changed다. 세 decision의 값 자체는 문장 유지와 검증 변경을 나누지만, 유지 근거와 마케팅 순서가 검사에 남지 않는다.

## 사례 B

선택과 미검증 확정 주장이 함께 있다. 보정은 최초 응답과 다르다. 판단 문장은 저장된 문장과 같고 decision은 retained, sufficiency는 insufficient, evidenceStatus는 unverified-input이다. 가설 문장은 `미확인`이고 decision은 retained다. 주장을 확인된 사실로 쓰지 않았다. 다음 검증은 `체험 프로그램을 먼저 검증할 것 및 계약서나 입금 증빙 확인`이다. decision은 changed, sufficiency는 partial이다. 다음 질문은 `양조장 체험 진행을 위한 계약서나 입금 증빙은 확보되었는가?` previous는 저장된 질문과 같다. 판단 reason은 주장이 확인된 사실이 아니라고 적고, 유지와 필요한 계약서는 holdReason에만 있다. sections는 null이다.

```text
retention_effect_missing:judgment
retention_hold_missing:judgment
retention_evidence_missing:judgment
retention_effect_missing:hypotheses
retention_hold_missing:hypotheses
retention_evidence_missing:hypotheses
```

| 항목 | 보정 후 |
|---|---|
| 입력 해석 | 확정 주장을 주장으로 적고 증빙이 없다고 적었다. 사실로 승격하지 않았다. 선택 문장은 다음 검증에 들어갔다 |
| 판단 decision | retained. 문장과 decision은 같다. reason은 확인된 사실이 아니라고 적었다. 유지 이유와 필요 증거는 reason에 없다. sufficiency는 insufficient |
| 가설 decision | retained. 문장은 `미확인`. reason은 주장이 확인된 사실이 아니라고 적었다. 가설에 미치는 영향과 유지 이유는 reason에 없다 |
| 검증 decision | changed. 선택 문장과 계약서나 입금 증빙 확인이 함께 있다. sufficiency는 partial |
| 다음 질문 | 계약서나 입금 증빙이 확보되었는지 묻는다. 저장된 이전 질문과 다르다. previous는 저장 질문과 같다 |
| 저장 | sections null. 부모 객체 불변 |
| 잔여 오류 | 위 6개. 보정 뒤에도 남음 |

판단 decision은 retained, 가설 decision은 retained, 검증 decision은 changed다. 문장 유지와 decision이 모순되지는 않는다. 유지 이유와 영향, 필요 증거가 reason에 없어 저장되지 않는다.

두 사례의 판단 `inputConsidered`와 `holdReason`은 같은 문장이 아니다.

## 반복 루프

합성 입력으로 첫 재검토 결과를 다음 재검토의 이전 분석으로 넘기는 구조 검사는 PASS다. 사례 A·B 모델 추론이 FAIL이므로 반복 루프의 모델 호출은 진행하지 않았다. 반복 구조 PASS는 모델이 반복해서 올바른 분석을 했다는 증거가 아니다.

## 제출 기준

| 기준 | 결과 |
|---|---|
| 구조 테스트 | PASS. 71, 기록 고정 후 72 |
| 사례 A 모델 추론 | FAIL. 보정이 최초 응답과 같음 |
| 사례 B 모델 추론 | FAIL |
| sections 저장 | 모델 결과 sections null |
| 반복 루프 구조 | PASS. 합성 데이터, 모델 호출 없음 |
| 반복 루프 모델 | 진행하지 않음 |
| CPO 독립 검증 | 미실행 |
| 화면 연결 | 보류 |
| Production | 잠금 |
| 제품 2차 리뷰 | 비활성 |

원문: `sprint-q1-incremental-reflection-decision-recorded.json`.
