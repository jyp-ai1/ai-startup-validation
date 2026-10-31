# Sprint Q1 relation trace

계약은 `reflection-output-11`이다. 출력 필드는 늘리지 않았다. 구조 테스트와 모델 추론은 따로 판정한다. 이 기록은 CPO PASS가 아니다.

## 실패 분류

| 코드 | 의미 |
|---|---|
| input_echo_only | 선택 문장을 검토 없이 복사 |
| status_repeat / trace_relation_missing | 상태 문장만 있고 선택과 판단의 관계가 없음 |
| retention_hold_missing / reason_insufficient / review_hold_generic | 유지 이유가 구체적이지 않거나 미확인만 반복 |
| retention_evidence_missing | 아직 없는 증거를 reason에 적지 않음 |
| priority_plan_unfocused | 선택 뒤에도 온라인 마케팅 검증이 남음 |
| claim_verification_missing / choice_unlinked | 선택과 증빙 확인이 다음 검증에 함께 없음 |
| decision_mismatch | 검증 문장이 바뀌었는데 decision이 retained |
| follow_up_output_previous / question_unchanged | 이전 질문이 저장값과 다르거나 같은 질문을 반복 |

## 구조

모델 호출 전에 기존 65건을 포함한 67 passed다. 시각은 2026-10-30 18:32 KST다. 기록 고정 테스트를 더한 뒤 68 passed다. 합성 데이터로 두 번째 답변을 이전 AI 분석 위에 누적하는 구조 검사는 PASS다. 그 검사는 모델 호출이 아니다.

| 검사 | 결과 |
|---|---|
| 선택만으로 사업 판단을 바꾸면 저장 차단 | PASS |
| 선택이 다음 검증에 없으면 저장 차단 | PASS |
| 마케팅 검증을 선택 뒤에 남기면 저장 차단 | PASS |
| 미검증 주장을 사실로 쓰면 저장 차단 | PASS |
| decision과 nextVerification이 어긋나면 저장 차단 | PASS |
| nextQuestion.previous가 저장 질문과 다르면 저장 차단 | PASS |
| 두 번째 합성 답변이 이전 분석 위에 누적 | PASS. 모델 호출 없음 |
| 잘못된 추론은 sections null | PASS |
| 부모 분석 객체 불변 | PASS |

## 모델 호출

Run ID `q1-incremental-reflection-relation-2026-10-30`. 이전 run `q1-incremental-reflection-meaning-2026-10-30`의 `finishedAt` `2026-10-30T09:05:09.623Z`는 유지됐다. Git SHA `73f3390c660f0450353b1d700e47a1cd54a61d36`. PR https://github.com/jyp-ai1/ai-startup-validation/pull/210. 시각 2026-10-30 18:33:07–18:33:36 KST. 모델 `gpt-4o-mini-2024-07-18`. 합계 prompt 17547, completion 3280, total 20827. 비용 NOT RUN. `productFollowUpInvoked` false. `responseFormat` `json_schema`. 호출 4회. 사례마다 보정 1회. 3번째 호출은 없다. 보정 응답은 최초 응답과 바이트가 같지 않다. 보정 뒤에도 오류가 남아 모델 추론은 FAIL이다. sections는 null이다.

선택은 둘 다 `체험 프로그램을 먼저 검증할 것`이다. 사례 A 추가 설명은 비어 있다. 사례 B 추가 설명은 합성 데이터이며, 양조장 한 곳과 체험 진행이 확정되었다는 주장과 계약서·입금 증빙이 없다는 문장이다.

## 사례 A

추가 설명은 없다. 보정은 최초 응답의 실패 코드를 지정했다. 보정 뒤 판단 문장은 저장된 문장과 같다. 가설은 `미확인`이다. 수요가 있다는 문장은 만들지 않았다. 다음 검증은 선택 문장과 수요·실행 가능성 확인을 포함하고, 온라인 마케팅 효과 검증은 빠졌다. decision은 changed다. `inputConsidered`는 선택 문장 그대로다. 유지 이유의 holdReason은 인터뷰 필요만 적고 판단을 유지한다는 말이 없다. 다음 질문은 `양조장 후보가 있는가?`다. sections는 null이다.

```text
retention_sufficiency_missing:judgment
retention_hold_missing:judgment
input_echo_only:judgment
retention_evidence_missing:hypotheses
retention_hold_missing:hypotheses
input_echo_only:hypotheses
question_not_from_input
next_question_unknown_missing
```

| 항목 | 보정 후 |
|---|---|
| 입력 해석 | 선택을 판단 문장으로 올리지는 않았다. inputConsidered는 선택 문장을 그대로 복사했다 |
| 판단 변화 | 저장된 판단 유지. reason은 선택이 증거가 아니라고 적었다. holdReason은 유지 이유가 없다 |
| 가설 변화 | `미확인` 유지. 수요 가설을 만들지 않았다. reason은 선택이 가설의 근거가 아니라고 적고, 필요한 증거는 빠졌다 |
| 검증 우선순위 | 선택 문장과 수요·실행 가능성 확인을 포함한다. 다음 질문은 양조장 후보로 돌아갔다 |
| 저장 | sections null. 부모 객체 불변 |

## 사례 B

선택과 미검증 확정 주장이 함께 있다. 보정은 최초 응답의 실패 코드를 지정했다. 판단 문장은 저장된 문장과 같다. 주장을 확인된 사실로 쓰지 않았다. `evidenceStatus`는 `unverified-input`이다. 가설은 `미확인`이고, 가설 검토는 그 주장을 적었다. 다음 검증은 계약서와 입금 증빙 확인을 포함하고 decision은 changed다. 선택 문장 `체험 프로그램을 먼저 검증할 것`은 다음 검증에 없다. nextQuestion.previous는 저장된 질문과 같다. sections는 null이다.

```text
retention_input_missing:judgment
retention_evidence_missing:judgment
retention_input_missing:hypotheses
retention_evidence_missing:hypotheses
choice_unlinked
next_verification_choice_absent
```

| 항목 | 보정 후 |
|---|---|
| 입력 해석 | 확정 주장을 주장으로 적고 사실로 승격하지 않았다. 선택 문장은 검토에 없다 |
| 판단 변화 | 저장된 판단 유지. 주장이 확인된 사실이 아니라고 적었다. sufficiency는 insufficient |
| 가설 변화 | `미확인` 유지. 가설 inputConsidered는 주장을 적었다. reason은 그 입력의 표지를 빠뜨렸다 |
| 검증 우선순위 | 증빙 확인은 들어갔다. 선택 문장은 빠졌다. 이전 질문은 저장값과 같다 |
| 저장 | sections null. 부모 객체 불변 |

두 사례의 판단 `inputConsidered`와 `holdReason`은 같은 문장이 아니다.

## 반복 루프

합성 입력으로 첫 재검토 결과를 다음 재검토의 이전 분석으로 넘기는 구조 검사는 PASS다. 부모 객체는 두 번 모두 그대로다. 두 번째 질문의 previous는 첫 재검토가 만든 질문이다. 사례 A·B 모델 추론이 FAIL이므로 반복 루프의 모델 호출은 진행하지 않았다.

## 제출 기준

| 기준 | 결과 |
|---|---|
| 구조 테스트 | PASS. 67, 기록 고정 후 68 |
| 사례 A 모델 추론 | FAIL |
| 사례 B 모델 추론 | FAIL |
| sections 저장 | 모델 결과 sections null |
| 반복 루프 구조 | PASS. 합성 데이터, 모델 호출 없음 |
| 반복 루프 모델 | 진행하지 않음 |
| CPO 독립 검증 | 미실행 |
| 화면 연결 | 보류 |
| Production | 잠금 |
| 제품 2차 리뷰 | 비활성 |

원문: `sprint-q1-incremental-reflection-relation-recorded.json`.
