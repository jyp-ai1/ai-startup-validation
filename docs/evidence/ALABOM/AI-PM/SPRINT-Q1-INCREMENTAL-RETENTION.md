# Sprint Q1 decision retention reasoning

계약은 `reflection-output-11`이다. 출력 필드는 늘리지 않았다. 구조 테스트와 모델 추론은 따로 판정한다. 이 기록은 CPO PASS가 아니다.

## 실패 분류

| 코드 | 의미 |
|---|---|
| reason_insufficient / retention_sufficiency_missing | 유지하면서 근거가 부족하다는 말이 reason에 없음 |
| input_echo_only | 선택 문장을 검토 없이 복사 |
| trace_relation_missing | 선택이 판단 또는 가설과 어떻게 관련되는지 impact에 없음 |
| review_hold_generic | impact가 추가 정보가 필요하다는 상태 문장 |
| claim_unmarked | 확정 주장을 주장 또는 미검증으로 표시하지 않음 |
| claim_verification_missing | 다음 검증에 계약서, 증빙, 입금이 없음 |

## 구조

모델 호출 전에 기존 72건을 포함한 73 passed다. 시각은 2026-10-30 19:45 KST다. 이 기록 고정 테스트를 더한 뒤 74 passed다. 늘어난 두 건은 이번 요청 고정과 이번 기록 고정이다. 의미 검사를 완화하지 않았다. 합성 데이터로 두 번째 답변을 이전 AI 분석 위에 누적하는 구조 검사는 PASS다. 그 검사는 모델 호출이 아니다.

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

Run ID `q1-incremental-reflection-retention-2026-10-30`. 이전 run `q1-incremental-reflection-decision-2026-10-30`의 `finishedAt` `2026-10-30T10:30:44.036Z`는 유지됐다. `q1-incremental-reflection-unified-2026-10-30`의 `finishedAt` `2026-10-30T10:06:57.047Z`도 유지됐다. Git SHA `610d52b60ae7de40f98e85030c7c90d32f2b6fad`. PR https://github.com/jyp-ai1/ai-startup-validation/pull/210. 시각 2026-10-30 19:46:10–19:46:39 KST. 모델 `gpt-4o-mini-2024-07-18`. 합계 prompt 18773, completion 3398, total 22171. 호출별 prompt/completion/total은 3892/784/4676, 5309/786/6095, 3969/934/4903, 5603/894/6497이다. 비용 NOT RUN. `productFollowUpInvoked` false. `responseFormat` `json_schema`. 호출 4회. 사례마다 최초 1회와 보정 1회. 3번째 호출은 없다. 두 보정의 `sameAsFirst`는 false다. 보정 뒤에도 오류가 남아 모델 추론은 FAIL이다. sections는 null이다.

선택은 둘 다 `체험 프로그램을 먼저 검증할 것`이다. 사례 A 추가 설명은 비어 있다. 사례 B 추가 설명은 합성 데이터이며, 양조장 한 곳과 체험 진행이 확정되었다는 주장과 계약서·입금 증빙이 없다는 문장이다.

## 사례 A

추가 설명은 없다. 보정은 최초 응답과 다르다. 판단 문장은 저장된 문장과 같다. decision은 retained, sufficiency는 insufficient, evidenceStatus는 unconfirmed다. 가설은 `미확인`이고 decision은 retained다. 다음 검증은 `체험 프로그램을 먼저 검증할 것. 그 다음에도 온라인 마케팅 검증은 남아 있다.` decision은 changed, sufficiency는 insufficient다. 체험 수요가 앞이고 온라인 마케팅은 그 다음 과제로 남았다. `priority_plan_unfocused`는 보정에서 사라졌다. 다음 질문은 `체험 프로그램 참여 의향은 얼마나 되나요?` previous는 저장된 질문과 같다. `inputConsidered`는 선택 문장 그대로다. 판단 reason은 `기존 판단을 유지하며, 추가 정보가 필요하다.` 유지라는 말은 있으나 근거가 부족하다는 말은 없다. 고객 인터뷰는 holdReason에만 있다. impact도 같은 상태 문장이다. sections는 null이다.

```text
reason_insufficient:judgment
retention_sufficiency_missing:judgment
review_hold_generic:impactAssessment:judgment
input_echo_only:judgment
trace_relation_missing:judgment
reason_insufficient:hypotheses
retention_sufficiency_missing:hypotheses
review_hold_generic:impactAssessment:hypotheses
input_echo_only:hypotheses
trace_relation_missing:hypotheses
```

| 항목 | 보정 후 |
|---|---|
| 입력 해석 | 선택을 판단 문장으로 올리지는 않았다. inputConsidered는 선택 문장 그대로다 |
| 판단 decision | retained. 문장과 decision은 같다. reason은 유지와 추가 정보가 필요하다고 적었다. 근거 부족은 reason에 없다. sufficiency는 insufficient |
| 가설 decision | retained. 문장은 `미확인`. reason은 판단과 같은 형태다. 가설과의 관계와 근거 부족은 reason에 없다 |
| 검증 decision | changed. 선택 문장이 앞이고, 온라인 마케팅은 그 다음에도 남아 있다. sufficiency는 insufficient |
| 다음 질문 | 체험 참여 의향을 묻는다. previous는 저장 질문과 같다. 저장 질문과 같지 않다 |
| 저장 | sections null. 부모 객체 불변. 보정은 최초 응답과 다르다 |
| 잔여 오류 | 위 10개 |

판단 decision은 retained, 가설 decision은 retained, 검증 decision은 changed다. 검증 순서는 Founder 선택과 연결됐다. 유지 reason은 영향, 근거 부족, 바꾸려면 필요한 증거를 한 문장에 담지 못했다.

## 사례 B

선택과 미검증 확정 주장이 함께 있다. 보정은 최초 응답과 다르다. 판단 문장은 저장된 문장과 같고 decision은 retained, sufficiency는 insufficient, evidenceStatus는 unverified-input이다. 가설 문장은 보정에서 `미확인`으로 돌아갔고 decision은 retained다. 주장을 확인된 사실로 승격하지는 않았다. 판단 reason은 `기존 판단과 동일하여 유지하며, 양조장과 계약이 필요하다.` 유지와 양조장은 있으나, 주장이라는 말과 근거가 부족하다는 말은 없다. 가설 reason은 `가설이 미확인 상태로 유지되며, 양조장과 계약이 필요하다.` 다음 검증은 `체험 프로그램을 먼저 검증할 것 및 온라인 마케팅 효과 검증을 진행해야 한다.` decision은 changed, sufficiency는 partial이다. 선택 문장은 들어갔으나 계약서나 입금 증빙은 빠졌고, 마케팅은 `및`으로 붙어 있다. 다음 질문은 `체험 프로그램과 마케팅 지원에 대한 계약서나 입금 증빙은 확보되었는가?` previous는 저장된 질문과 같고, 저장 질문과 다른 문장이다. sections는 null이다.

```text
reason_insufficient:judgment
retention_sufficiency_missing:judgment
claim_unmarked:judgment
reason_insufficient:hypotheses
retention_sufficiency_missing:hypotheses
claim_verification_missing
```

| 항목 | 보정 후 |
|---|---|
| 입력 해석 | evidenceStatus는 unverified-input이다. 확정 문장을 확인된 사실로 쓰지 않았다. reason은 그 주장을 미검증 주장으로 표시하지 않았다 |
| 판단 decision | retained. 문장과 decision은 같다. reason은 유지와 계약 필요를 적었다. 근거 부족과 주장 표시는 reason에 없다. sufficiency는 insufficient |
| 가설 decision | retained. 문장은 `미확인`. reason은 미확인 유지와 계약 필요를 적었다. 근거 부족은 없다 |
| 검증 decision | changed. 선택 문장은 있다. 계약서나 입금 증빙은 없다. 온라인 마케팅은 `및`으로 붙어 있다. sufficiency는 partial |
| 다음 질문 | 계약서나 입금 증빙을 묻는다. 대상은 마케팅 지원이다. previous는 저장 질문과 같다 |
| 저장 | sections null. 부모 객체 불변 |
| 잔여 오류 | 위 6개. 보정 뒤에도 남음 |

판단 decision은 retained, 가설 decision은 retained, 검증 decision은 changed다. 미검증 주장을 사실로 올리지는 않았다. 유지 reason이 주장의 영향과 부족한 증거를 함께 설명하지 않고, 다음 검증에서 계약서·입금 확인이 빠졌다.

두 사례의 판단 `inputConsidered`는 같은 문장이 아니다.

## 반복 루프

합성 입력으로 첫 재검토 결과를 다음 재검토의 이전 분석으로 넘기는 구조 검사는 PASS다. 사례 A·B 모델 추론이 FAIL이므로 반복 루프의 모델 호출은 진행하지 않았다. 반복 구조 PASS는 모델이 반복해서 올바른 분석을 했다는 증거가 아니다.

## 제출 기준

| 기준 | 결과 |
|---|---|
| 구조 테스트 | PASS. 73, 기록 고정 후 74. 기존 72 유지 |
| 사례 A 모델 추론 | FAIL. 검증 순서는 갈라졌고 유지 근거는 비어 있음 |
| 사례 B 모델 추론 | FAIL. 주장은 미검증이나 유지 근거와 증빙 검증이 빠짐 |
| sections 저장 | 모델 결과 sections null |
| 반복 루프 구조 | PASS. 합성 데이터, 모델 호출 없음 |
| 반복 루프 모델 | 진행하지 않음 |
| CPO 독립 검증 | 미실행 |
| 화면 연결 | 보류 |
| Production | 잠금 |
| 제품 2차 리뷰 | 비활성 |

원문: `sprint-q1-incremental-reflection-retention-recorded.json`.
