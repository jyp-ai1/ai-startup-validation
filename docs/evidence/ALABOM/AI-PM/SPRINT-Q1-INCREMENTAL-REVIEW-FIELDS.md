# Sprint Q1 review fields

계약은 `reflection-output-11`이다. 유지·유보 판단에 `inputConsidered`, `impactAssessment`, `sufficiencyAssessment`, `retentionDecision`, `holdReason`, `evidenceNeeded`를 스키마로 요구한다. 비거나 일반적인 검토는 저장하지 않는다. 코드는 그 문장을 만들지 않는다. 보정 호출은 1회다. 화면, Production, 제품 2차 리뷰는 호출하지 않았다. 현재 판정은 FAIL이다. 이 기록은 CPO PASS가 아니다.

## 계약 비교

| 항목 | 이전 | 이번 |
|---|---|---|
| 계약 ID | `reflection-output-11` | `reflection-output-11` |
| 출력 형식 | `json_object` | ungated follow-up만 strict `json_schema` |
| 검토 필드 | reason 문장 | 원소마다 여섯 필드 필수 |
| 누락 | 저장될 수 있었음 | `review_field_missing`이면 sections는 null |
| 보정 | 없음 | 실패 시 1회. 최초 응답과 보정 응답을 모두 기록 |
| 1차 리뷰와 revision gate | `json_object` | `json_object` |

## 구조

호출 전에 기존 56건과 신규 계약 테스트 3건, 합계 59 passed다. 시각은 2026-10-30 17:07 KST다.

| 사례 | 결과 |
|---|---|
| A–E 합성 답변 | PASS. 주입 응답 |
| 여섯 필드 누락, 일반적 hold, sufficient인데 retained | PASS. 저장 차단 |
| 확정 주장을 검토 필드에서 사실로 씀 | PASS. `claim_promoted_to_fact` |
| 보정 1회 후 저장, 두 원문과 토큰 합산 | PASS. 주입 응답 |
| 보정도 실패하면 3번째 호출 없음 | PASS |
| changes → sections, 부모 불변, 자식 재조회, 중복 제출 | PASS |
| 이번 모델 원문 | FAIL. sections null |

## 격리 호출

| 항목 | 값 |
|---|---|
| Run ID | `q1-incremental-reflection-review-fields-2026-10-30` |
| 이전 run | `q1-incremental-reflection-reason-quality-2026-10-30`. `finishedAt` `2026-10-30T07:34:42.284Z` 유지 |
| Git SHA | `98c492d4b265c5a2e0ea5418e99525173eef8e67` |
| PR | https://github.com/jyp-ai1/ai-startup-validation/pull/210 |
| 시각 | 2026-10-30 17:09:03–17:09:20 KST |
| 모델 | `gpt-4o-mini-2024-07-18` |
| 최초 Prompt / completion / total | 3535 / 745 / 4280 |
| 보정 Prompt / completion / total | 4491 / 745 / 5236 |
| 합계 | 8026 / 1490 / 9516 |
| 보정 | 1. 3번째 호출 없음 |
| 비용 | NOT RUN |
| `productFollowUpInvoked` | false |
| `responseFormat` | `json_schema` |
| sections 저장 | 아니오. 검증기가 sections를 null로 둔다 |
| 부모 | 제품 경로를 호출하지 않았다. 같은 원문을 정규화해도 부모 객체를 바꾸지 않고 sections는 null이다 |
| 원문 | `sprint-q1-incremental-reflection-review-fields-recorded.json` |

요청의 선택은 `체험 프로그램을 먼저 검증할 것`이다. 추가 설명에는 `확정된 양조장`이 없고, 그 문장은 테스트용 합성 설명이다.

스키마는 여섯 필드를 빠뜨리지 못하게 했다. 모델은 필드를 채웠다. 채운 내용은 추가 설명을 검토한 결과가 아니다.

| 필드 | 판단 | 가설 |
|---|---|---|
| inputConsidered | `체험 프로그램을 먼저 검증할 것` | 같은 선택 문장 |
| impactAssessment | `기존 판단에 변화가 없다.` | `기존 가설에 변화가 없다.` |
| sufficiencyAssessment | 최초 `sufficient`, 보정 후 `insufficient` | 동일 |
| retentionDecision | `retained` | `retained` |
| holdReason | `기존 판단이 여전히 유효하다.` | `새로운 정보가 없기 때문에 가설을 유지한다.` |
| evidenceNeeded | `체험 프로그램을 제공할 수 있는 양조장 후보에 대한 정보.` | `체험 프로그램에 대한 수요 검증 결과.` |

| 검증 질문 | 결과 |
|---|---|
| 양조장 확보에 관한 새 정보를 식별하는가 | FAIL. `inputConsidered`에 `확정된 양조장`이 없다 |
| 확정 주장을 검증된 사실로 취급하는가 | 사실로 올리지 않았다. `evidenceStatus`는 `unverified-input`이고 판단 문장은 그대로다 |
| 기존 가설에 미치는 영향을 설명하는가 | FAIL. `변화가 없다`만 있다 |
| 유지 이유가 구체적인가 | FAIL. 추가 설명이 왜 부족한지 말하지 않는다 |
| 어떤 증빙이면 판단을 바꾸는가 | FAIL. 계약서, 예약, 입금 같은 증빙이 없다 |
| 다음 검증 계획과 질문이 그 분석에서 나오는가 | FAIL. 질문은 `양조장 후보가 있는가?`이나 검증 계획이 잘렸고 `next_verification_not_executable`이다 |

보정 응답의 검증 코드:

```text
reason_insufficient:judgment
retention_input_missing:judgment
retention_sufficiency_missing:judgment
retention_evidence_missing:judgment
retention_hold_missing:judgment
reason_insufficient:hypotheses
retention_input_missing:hypotheses
retention_sufficiency_missing:hypotheses
retention_evidence_missing:hypotheses
next_verification_not_executable
```

최초 응답은 여기에 `sufficiency_conflict:judgment`와 `sufficiency_conflict:hypotheses`가 더 있다. 보정은 그 두 코드만 없앴다. sections는 null이다.

## 잔여 오류

모델이 선택 문장을 새 정보로 적고, 추가 설명은 새 정보가 아니라고 썼다. 검증 계획에서 `확정된 공급처로 간주하지`와 가격·예약의 별도 검증이 빠졌다. 세 번째 호출은 하지 않았다.
