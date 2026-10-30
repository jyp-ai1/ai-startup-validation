# Sprint Q1 unified incremental review

계약은 `reflection-output-11`이다. 출력 필드는 늘리지 않았다. 구조 테스트와 모델 추론은 따로 판정한다. 이 기록은 CPO PASS가 아니다.

## 실패 분류

| 코드 | 의미 |
|---|---|
| retention_hold_missing | 판단을 유지하면서 reason에 유지 이유가 없음. `동일하며`는 유지가 아니다 |
| input_echo_only | 선택 문장을 검토 없이 복사 |
| reason_insufficient / retention_sufficiency_missing | 가설을 유지하면서 근거가 부족하다는 말이 없음 |
| trace_relation_missing | 선택 또는 계획과 가설의 관계가 impact에 없음 |
| decision_mismatch | 문장은 같은데 decision만 changed |
| sufficiency_conflict | decision이 changed인데 sufficiency가 insufficient |
| question_unchanged | 다음 질문이 저장된 이전 질문과 같음 |
| question_claim_unlinked | 미검증 확정 주장인데 다음 질문이 계약서·입금 증빙을 묻지 않음 |
| next_question_regressed | 체험 우선 선택 뒤에 마케팅 우선 질문으로 돌아감 |

## 구조

모델 호출 전에 기존 68건을 포함한 69 passed다. 시각은 2026-10-30 19:05 KST다. 이 기록 고정 테스트를 더한 뒤 70 passed다. 합성 데이터로 두 번째 답변을 이전 AI 분석 위에 누적하는 구조 검사는 PASS다. 그 검사는 모델 호출이 아니다.

선택만 들어온 입력에서 양조장 후보 질문, 이전 질문 반복, 선택 문장만 복사한 판단, 근거가 부족한 가설 유지는 저장되지 않는다. 선택과 미검증 주장이 함께 들어온 입력에서 문장을 그대로 두고 decision만 changed로 두는 판단, 선택 문장을 뺀 검증 계획, 계약서·입금 증빙을 묻지 않고 마케팅 우선 질문으로 돌아가는 다음 질문은 저장되지 않는다.

| 검사 | 결과 |
|---|---|
| 선택만으로 사업 판단을 바꾸면 저장 차단 | PASS |
| 선택 문장만 복사하거나 유지 이유가 `동일`이면 저장 차단 | PASS |
| 가설을 유지하면서 근거 부족을 빠뜨리면 저장 차단 | PASS |
| 마케팅 검증을 선택 뒤에 남기면 저장 차단 | PASS |
| 무관한 양조장 후보 질문이면 저장 차단 | PASS |
| 미검증 주장을 사실로 쓰면 저장 차단 | PASS |
| 선택과 계약서·입금 증빙이 함께 없으면 저장 차단 | PASS |
| 문장은 같고 decision만 바꾸면 저장 차단 | PASS |
| 다음 질문이 저장 질문과 같거나 증빙을 묻지 않으면 저장 차단 | PASS |
| 두 번째 합성 답변이 이전 분석 위에 누적 | PASS. 모델 호출 없음 |
| 잘못된 추론은 sections null | PASS |
| 부모 분석 객체 불변 | PASS |

## 모델 호출

Run ID `q1-incremental-reflection-unified-2026-10-30`. 이전 run `q1-incremental-reflection-relation-2026-10-30`의 `finishedAt` `2026-10-30T09:33:36.617Z`는 유지됐다. `q1-incremental-reflection-meaning-2026-10-30`의 `finishedAt` `2026-10-30T09:05:09.623Z`도 유지됐다. Git SHA `1e25e87747020e1eb08e9176590219e562caf19e`. PR https://github.com/jyp-ai1/ai-startup-validation/pull/210. 시각 2026-10-30 19:06:25–19:06:57 KST. 모델 `gpt-4o-mini-2024-07-18`. 합계 prompt 18111, completion 3538, total 21649. 호출별 prompt/completion/total은 3841/803/4644, 4979/940/5919, 3974/929/4903, 5317/866/6183이다. 비용 NOT RUN. `productFollowUpInvoked` false. `responseFormat` `json_schema`. 호출 4회. 사례마다 보정 1회. 3번째 호출은 없다. 보정 응답은 최초 응답과 바이트가 같지 않다. 보정 뒤에도 오류가 남아 모델 추론은 FAIL이다. sections는 null이다.

선택은 둘 다 `체험 프로그램을 먼저 검증할 것`이다. 사례 A 추가 설명은 비어 있다. 사례 B 추가 설명은 합성 데이터이며, 양조장 한 곳과 체험 진행이 확정되었다는 주장과 계약서·입금 증빙이 없다는 문장이다.

## 사례 A

추가 설명은 없다. 보정은 최초 응답의 실패 코드를 지정했다. 보정 뒤 판단 문장은 저장된 문장과 같다. decision은 retained, sufficiency는 insufficient, evidenceStatus는 unconfirmed다. 가설은 `미확인`이다. 수요가 있다는 문장은 만들지 않았다. 다음 검증은 `체험 프로그램을 먼저 검증할 것: 체험 프로그램의 수요와 실행 가능성을 확인하는 순서.`다. 온라인 마케팅 효과 검증은 빠졌다. 그 decision은 changed다. 다음 질문은 `체험 프로그램에 참여할 의향이 있는 고객이 얼마나 될까?`다. previous는 저장된 질문 `체험 프로그램과 마케팅 지원 중 어느 쪽을 먼저 검증할지?`와 같다. `양조장 후보가 있는가?`는 아니다. `inputConsidered`는 판단과 가설 모두 선택 문장 그대로다. 판단 reason은 `동일하며`라고 적고 `유지` 또는 `바꾸지`가 없다. holdReason은 유지와 부족, 인터뷰 필요를 적었다. 가설 reason은 미확인 유지를 적지만 근거가 부족하다는 말이 없다. 가설 impact는 선택 또는 계획과 가설의 관계를 적지 않았다. sections는 null이다.

```text
retention_hold_missing:judgment
input_echo_only:judgment
reason_insufficient:hypotheses
retention_sufficiency_missing:hypotheses
input_echo_only:hypotheses
trace_relation_missing:hypotheses
```

| 항목 | 보정 후 |
|---|---|
| 입력 해석 | 선택을 판단 문장으로 올리지는 않았다. inputConsidered는 선택 문장을 그대로 복사했다 |
| 판단 변화 | 저장된 판단 유지. reason은 선택이 판단의 근거가 아니라고 적고 고객 인터뷰가 필요하다고 적었다. `동일하며`라서 유지 이유는 불충분하다. sufficiency는 insufficient |
| 가설 변화 | `미확인` 유지. 수요 가설을 만들지 않았다. reason은 추가 정보가 필요하다고만 적고 근거 부족은 없다 |
| 검증 우선순위 | 선택 문장과 수요·실행 가능성 확인을 포함한다. 온라인 마케팅 효과 검증은 빠졌다 |
| 다음 질문 | 체험 참여 의향을 묻는다. previous는 저장 질문과 같다. 양조장 후보 질문은 아니다 |
| 저장 | sections null. 부모 객체 불변 |
| 잔여 오류 | 위 6개. 보정 뒤에도 남음 |

## 사례 B

선택과 미검증 확정 주장이 함께 있다. 보정은 최초 응답의 실패 코드를 지정했다. 판단 문장은 저장된 문장과 같다. 주장을 확인된 사실로 쓰지 않았다. `evidenceStatus`는 `unverified-input`이다. 그러나 decision은 changed이고 sufficiency는 insufficient다. 가설 문장은 `미확인`인데 decision은 changed다. 다음 검증은 `체험 프로그램을 먼저 검증할 것 및 계약서 또는 입금 증빙 확인`이다. 선택 문장과 증빙 확인이 함께 있다. decision은 changed다. 다음 질문은 저장된 이전 질문 `체험 프로그램과 마케팅 지원 중 어느 쪽을 먼저 검증할지?`와 같다. 계약서나 입금 증빙을 묻지 않는다. sections는 null이다.

```text
decision_mismatch:judgment
reason_insufficient:judgment
sufficiency_conflict:judgment
decision_mismatch:hypotheses
reason_insufficient:hypotheses
sufficiency_conflict:hypotheses
decision_mismatch:nextQuestion
reason_insufficient:nextQuestion
question_unchanged
question_claim_unlinked
next_question_regressed
```

| 항목 | 보정 후 |
|---|---|
| 입력 해석 | 확정 주장을 주장으로 적고 계약서와 입금 증빙이 없다고 적었다. 사실로 승격하지 않았다. 선택 문장은 다음 검증에 들어갔다 |
| 판단 변화 | 문장은 저장된 판단과 같다. reason은 증빙이 없어 판단을 변경한다고 적었다. decision은 changed라서 문장과 어긋난다 |
| 가설 변화 | 문장은 `미확인`이다. decision은 changed다. 주장을 가설 문장에 붙이지는 않았다. 유지 근거는 decision과 맞지 않는다 |
| 검증 우선순위 | 선택 문장과 계약서 또는 입금 증빙 확인이 함께 있다 |
| 다음 질문 | 저장된 이전 질문과 같다. 마케팅 우선 질문으로 돌아갔고 증빙을 묻지 않는다 |
| 저장 | sections null. 부모 객체 불변 |
| 잔여 오류 | 위 11개. 보정 뒤에도 남음 |

두 사례의 판단 `inputConsidered`와 `holdReason`은 같은 문장이 아니다.

## 반복 루프

합성 입력으로 첫 재검토 결과를 다음 재검토의 이전 분석으로 넘기는 구조 검사는 PASS다. 부모 객체는 두 번 모두 그대로다. 두 번째 질문의 previous는 첫 재검토가 만든 질문이다. 사례 A·B 모델 추론이 FAIL이므로 반복 루프의 모델 호출은 진행하지 않았다. 반복 구조 PASS는 모델이 반복해서 올바른 분석을 했다는 증거가 아니다.

## 제출 기준

| 기준 | 결과 |
|---|---|
| 구조 테스트 | PASS. 69, 기록 고정 후 70 |
| 사례 A 모델 추론 | FAIL |
| 사례 B 모델 추론 | FAIL |
| sections 저장 | 모델 결과 sections null |
| 반복 루프 구조 | PASS. 합성 데이터, 모델 호출 없음 |
| 반복 루프 모델 | 진행하지 않음 |
| CPO 독립 검증 | 미실행 |
| 화면 연결 | 보류 |
| Production | 잠금 |
| 제품 2차 리뷰 | 비활성 |

원문: `sprint-q1-incremental-reflection-unified-recorded.json`.
