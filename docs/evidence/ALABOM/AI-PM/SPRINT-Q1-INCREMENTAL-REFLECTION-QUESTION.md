# Sprint Q1 question contract

미확인 가설을 유지하고 질문 칸에 실제 질문만 두도록 계약을 좁힌 뒤의 새 실행이다. 이전 열한 run은 반복하지 않았다. 자동 검증 오류는 비어 있지 않다. 증분 반영 기준은 충족되지 않았다. 1차 검증 단계가 아니다. 기본값은 `quality-2`다. Production 잠금은 유지했다. 제품 2차 리뷰 경로는 호출하지 않았다.

## 별도 기록

| 기록 | run id | 상태 | 실행 SHA | 시각 |
|---|---|---|---|---|
| 직접 호출 | `q1-incremental-structure-2026-10-29` | `RECORDED` 유지 | `ca72261c9a3623707e8d2e94eafe90a05178d2c9` | 2026-10-29 18:30:43–18:30:50 KST |
| 짧은 키 반환 | `q1-incremental-reflection-2026-10-29` | `RECORDED` 유지 | `1f153fc754fc50533351593d40768949de951f91` | 2026-10-29 21:18:08–21:18:12 KST |
| 객체 맵 반환 | `q1-incremental-reflection-output-2026-10-29` | `RECORDED` 유지 | `8c3f236eea62a27a551e88005e147b43984368d9` | 2026-10-29 21:37:25–21:37:32 KST |
| 배열 계약 | `q1-incremental-reflection-array-2026-10-29` | `RECORDED` 유지 | `24a100b3809d32f05c2ca225ffdc7f9761baf7b4` | 2026-10-29 21:55:35–21:55:43 KST |
| 근거 검사 | `q1-incremental-reflection-grounds-2026-10-29` | `RECORDED` 유지 | `51ac2cadf0d445e3f9b948781749359130d240c3` | 2026-10-29 22:11:09–22:11:18 KST |
| 루트 출처 | `q1-incremental-reflection-source-2026-10-29` | `RECORDED` 유지 | `62b689669d7da43266029c3b3c4692c606b8f8bb` | 2026-10-29 22:31:57–22:32:05 KST |
| 원소 추적 | `q1-incremental-reflection-trace-2026-10-29` | `RECORDED` 유지 | `09ff316a35e3e889fde9c0587091fbf79bfcd847` | 2026-10-29 22:42:26–22:42:39 KST |
| 유지 이유 | `q1-incremental-reflection-reason-2026-10-29` | `RECORDED` 유지 | `ab1aa7c40e539732a05576c85b60c708b12f3f52` | 2026-10-29 22:54:33–22:54:44 KST |
| 선택·수익 보존 | `q1-incremental-reflection-preserve-2026-10-29` | `RECORDED` 유지 | `51d6e6aac0de456297db39d5e7c9636e9268c75b` | 2026-10-29 23:09:53–23:10:07 KST |
| 원소 추적 | `q1-incremental-reflection-element-2026-10-29` | `RECORDED` 유지 | `92a663bd43f2a6e299b7fc317faac4899243a229` | 2026-10-29 23:36:39–23:36:57 KST |
| 선택 연결 | `q1-incremental-reflection-link-2026-10-29` | `RECORDED` 유지 | `1fb52b05400b1f98ffc39788790b71456d49cf62` | 2026-10-29 23:52:23–23:52:46 KST |
| 이번 질문 계약 | `q1-incremental-reflection-question-2026-10-29` | `RECORDED` | `42d087ccd0c5e06638ee9a6b8cf6d4baa0a4a264` | 2026-10-30 00:17:26–00:17:41 KST |

모델 `gpt-4o-mini-2024-07-18`. temperature 0.2. max tokens 2400. prompt 2972, completion 1167, finish `stop`. 원문 `sprint-q1-incremental-reflection-question-recorded.json`. `productFollowUpInvoked`는 false다. `reflectionScored`는 false다. `outputContract`는 `reflection-output-10`다. `answerOrigin`은 `synthetic-test-data`다. 이전 선택 연결 run의 `finishedAt` `2026-10-29T14:52:46.835Z`는 유지됐다.

호출 전 회귀는 모델 없이 45 passed다. 시각은 2026-10-30 00:16 KST다. 미확인 가설을 다른 문장으로 바꾸면 실패한다. 질문이 물음표로 끝나지 않거나 지시 문장이면 실패한다. `effect`와 `reason`이 같으면 실패한다. 그 통과는 이 반환의 품질 통과가 아니다.

## 자동 검증

`followUpOutputContractErrors` 결과:

```text
founder_answer_choice:hypotheses
founder_answer_supplement_missing:hypotheses
choice_effect_label:hypotheses
choice_effect_unrelated:hypotheses
founder_answer_choice:nextVerification
founder_answer_supplement_missing:nextVerification
choice_effect_label:nextVerification
choice_effect_priority_unlinked:nextVerification
next_verification_choice_unmentioned
founder_answer_choice:nextQuestion
founder_answer_supplement_missing:nextQuestion
choice_effect_label:nextQuestion
choice_effect_unrelated:nextQuestion
```

가설은 `미확인`으로 남았고, 질문은 `양조장 후보가 있는가?`다. 검증 문장과 수익 가설도 저장 계약과 같다. 판단 원소만 선택 문장과 추가 설명을 남겼다. 가설·검증·질문 원소는 `founderAnswer.choice`, `founderAnswer.supplement`, `choiceTrace.label`을 null로 두었다. 가설 `effect`는 `미확인`뿐이다. 검증 `effect`는 선택 문장의 앞부분과 `관계를 설명한다`로 끝나고, 수요가 입증되지 않는다는 한계가 없다. 질문 `effect`는 질문 문장과 `질문이 필요함을 설명한다`이고 선택 문장이 없다.

## 필드

| 필드 | 저장값 | 반환 | 내용 |
|---|---|---|---|
| `judgment` | 양조장 체험을 구상 중이라는 요약 | 같은 문장 | `decision`은 `retained`. 선택 문장, 추가 설명, `plan`, `unverified-input`이 있음 |
| `hypotheses` | `미확인` | `미확인` | `decision`은 `retained`. 수요 문장은 없음. `choice`와 `supplement`와 `label`은 null. `effect`는 `미확인` |
| `nextVerification` | 체험 수요와 온라인 마케팅 효과 | 양조장 후보, 협력 가능 여부, 참여 의향, 가격·예약 별도 | 검증 문장은 요구 문장과 같음. `choice`와 `label`은 null. `reason`은 없음을 말하나 선택 문장을 빠뜨림. `effect`는 한계를 빠뜨림 |
| `nextQuestion` | 체험과 마케팅 중 어느 쪽을 먼저 검증할지 | `양조장 후보가 있는가?` | `previous`는 저장된 질문과 같음. 질문 본문은 물음표로 끝남. `choice`와 `label`은 null. `reason`은 선택 문장의 앞부분과 없음을 말함 |
| `revenueModel` | `가설: 체험 프로그램 참가비 및 관련 상품 판매 수익(가설)` | 같은 문장 | 저장된 가설을 그대로 둠 |
| `evidenceStatus` | `unverified-input` | 네 원소 모두 `unverified-input` | 확인된 사실로 올리지 않음 |

`hypothesis_unconfirmed_replaced`, `hypothesis_demand_ungrounded`, `next_question_not_a_question`, `revenue_hypothesis_replaced`, `choice_promoted_to_judgment`, `next_verification_not_executable`는 이 반환에 없다.

## 기준

| 기준 | 이 호출 |
|---|---|
| 새 run, SHA, 시각 | 위 표. 이전 열한 객체의 `finishedAt`은 유지 |
| 미확인 가설 | `미확인` 유지. 수요 문장은 없음 |
| 실제 질문 | `양조장 후보가 있는가?` `previous`는 저장된 질문과 같음 |
| 검증 문장 | 요구 문장과 같음. `effect`와 `reason`은 선택 원문과 한계를 함께 담지 않음 |
| 수익 가설과 `evidenceStatus` | 저장 문장과 같고 네 원소 모두 `unverified-input` |
| 원소의 선택과 추가 설명 | 판단만 남음. 가설·검증·질문은 null |
| 자동 검증 오류 `[]` | 아님. 13건 |

증분 반영 관문은 이 호출에서도 충족되지 않았다. 빈 오류 목록이 아니다. 테스트 45 passed와 이 반환의 품질 통과는 별도다.

## 하지 않은 관문

| 관문 | 상태 |
|---|---|
| 제품 요청 구조 | PASS. SHA `eed29780cf9b43f2f580bb003bd7c0142c053a77` |
| 증분 반영 | FAIL |
| 2차 품질 | NOT RUN |
| 저장·복원 | NOT RUN |
| 화면 Q9·Q10 | BLOCKED. 2026-10-29 18:07 KST |
| Production | 잠금 유지 |
| 기본 프롬프트 | `quality-2` |
| 제품 2차 리뷰 | 호출하지 않음 |
