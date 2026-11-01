# Sprint 2 — AI Decision Contract

2026-11-01 23:29 KST 설계다. 그 시점의 코드 변경은 0이었다. 기존 `STATE_SYSTEM`과 `SELECTION_SYSTEM` 문장은 바꾸지 않았다. PR #227 실패 행은 유지한다. Sprint 2 PASS는 선언하지 않는다.

2026-11-01 23:49 KST CPO 조건부 승인의 세 가지 보완을 이 계약에 반영했다. `SIMULATION`은 사실 상태가 아니다. 원문 구간은 검증이 아니다. 미연결 정보는 질문과 따로 누적된다. 1차 구현과 단위 테스트의 결과는 `SPRINT-2-CONTINUITY-IMPLEMENTATION.md`다. GPT 실호출은 0회다.

앞선 설계 `SPRINT-2-DECISION-CONTRACT-DESIGN.md`의 네 기둥은 유지한다. 이번 문서는 #227에서 확인된 전달 공백과 CPO가 지정한 상태·변경 유형을 그 기둥에 붙인다. 실험 B에서 보았던 “요청에 `currentAnswer`가 없음”과 #227에서 보았던 “`currentAnswer`는 있는데 구간이 0건”은 둘 다 실패다.

## 1. 역할

GPT가 사업 판단과 다음 검증 목표의 문장을 쓴다. 코드는 출처, 상태, 연결, 필수 항목만 검사한다. 코드는 판단 문장을 고르거나 다음 질문을 다른 문장으로 바꾸지 않는다. 검사가 실패하면 그 행은 `failed`로 저장되고, 질문은 창업자에게 나가지 않는다. 실패 행을 같은 내용으로 다시 호출하지 않는다.

한 단계의 답이 모두 저장되면 통합 재분석은 1회다. 답 저장과 미완료 단계는 0회다. 이미 있는 2회 호출 실험은 제품 경로로 올리지 않는다. #227이 그 실험의 상태 호출에서 실패했고, 선택 품질은 NOT TESTED다. 선택 문장은 같은 1회 응답 안에 두고, 앞의 세 검사가 실패하면 그 선택 부분을 보여 주지 않는다.

## 2. 사실 상태와 출처

사실 여부와 데이터가 어디서 왔는지는 다른 축이다.

| 축 | 값 |
| --- | --- |
| `epistemicStatus` | `VERIFIED_FACT`, `FOUNDER_CLAIM`, `ASSUMPTION`, `UNKNOWN` |
| `provenance` | `FOUNDER_INPUT`, `SIMULATION`, `EXTERNAL_EVIDENCE`, `AI_INFERENCE` |

`SIMULATION`은 `epistemicStatus`에 넣지 않는다. 연습 입력이 실제 창업자 사실로 바뀌지 않게, 본문이 `SIMULATION`으로 시작하면 `provenance`는 `SIMULATION`으로 고정한다. 호출자가 `FOUNDER_INPUT`을 넘겨도 바꾸지 않는다.

| `epistemicStatus` | 의미 | 저장 조건 |
| --- | --- | --- |
| `VERIFIED_FACT` | 사업 사실관계가 따로 검증됨 | `provenance`가 `EXTERNAL_EVIDENCE`이고 `evidenceId`가 있을 때만 유지. 아니면 `AI_INFERENCE`는 `ASSUMPTION`, 그 외는 `FOUNDER_CLAIM`으로 내린다 |
| `FOUNDER_CLAIM` | 창업자가 그렇게 말함. 연습 문장도 주장일 수 있음 | 기본값. 원문 구간이 있어도 이 상태로 남는다 |
| `ASSUMPTION` | 검증되지 않은 가정. 모델 추론이 사실로 올라오려 할 때의 강등 포함 | 긍정 판단의 확인 근거가 될 수 없음 |
| `UNKNOWN` | 아직 확인되지 않음. 미답 질문 포함 | 답하지 않았다는 이유로 긍정이나 부정이 되지 않음 |

세 가지는 서로 대체하지 않는다.

| 구분 | 의미 | “양조장과 계약했다” |
| --- | --- | --- |
| 원문 구간 | 그 문장이 출처 안에 있음 | 창업자 답에 그 문장이 있으면 구간은 맞다 |
| `FOUNDER_CLAIM` | 창업자가 그렇게 말함 | 계약했다는 말 자체 |
| `VERIFIED_FACT` | 별도의 검증 근거 | 계약서 같은 `evidenceId`가 있을 때만. 말만으로는 불가 |

연습 문장 “양조장 한 곳에 문의했지만 아직 참여 의향은 확인하지 못했다.”는 `epistemicStatus` `FOUNDER_CLAIM`이고 `provenance` `SIMULATION`이다. `VERIFIED_FACT`로 요청해도 저장은 주장으로 내린다.

## 3. Answer Grounding

이번 답 또는 이번 요청의 `unlinkedStatements`에 있는 구간만 변화다. 구간은 그 원문의 `spanStart`부터 `spanEnd` 직전과 같은 문자열이다.

#227 연습 문장에서 허용되는 읽기:

| 항목 | 읽기 | `epistemicStatus` | `provenance` | 구간 |
| --- | --- | --- | --- | --- |
| 상품 | 구상 단계 | `FOUNDER_CLAIM` | `SIMULATION` | `상품 구성은 구상이다` |
| 공급 계약 | 없음 | `FOUNDER_CLAIM` | `SIMULATION` | `공급 계약과 가격은 없다` |
| 가격 | 미정. 수익 모델은 `UNKNOWN` | `FOUNDER_CLAIM` | `SIMULATION` | 같은 구간 |

허용되지 않는 읽기:

- 양조장 협력 가능성이 높다.
- 수요가 증가하고 있다.
- 고객이 구매할 의향이 있다.
- 개인화 경험 수요를 충족시킬 잠재력이 이번 답으로 확인됐다.

원문이 공백이면 호출 전에 `answer_missing`으로 막고 호출은 0회다. 이 검사는 `requestCarriesAnswer`에 있다. 2026-11-02 08:32 KST부터 변화 목록이 비어 있다는 이유만으로 제품 흐름을 실패시키지 않는다. 사업 판단의 정답 여부는 코드 검수 대상이 아니다.

구간이 출처에 없으면 그 인용은 실패다. 구간이 있다고 `VERIFIED_FACT`가 되지는 않는다. `VERIFIED_FACT`는 `EXTERNAL_EVIDENCE`와 `evidenceId`가 있을 때만 남는다. 1차의 문제, 지불자, 경쟁, 관심 증가, 수요 증가, `충족`은 입력 구간이 없고 별도 증거도 없으므로 확인 사실이 아니다. 수익 문장에 “가설”이 붙은 것은 `ASSUMPTION`으로 남을 수 있다. 이 1차 모델 출력 강등은 저장 계약에 적혀 있고, 라이브 1차 재호출은 하지 않았다.

## 4. Unknown Preservation

미답 `q1` “양조장과의 협력 가능성을 어떻게 확인할 것인가?”는 `UNKNOWN`이다. 선택지 `c1` `c2` `c3` `other`는 선택되지 않았다. 선택 라벨의 단독 어간을 판단, 영향, 변화, 델타에 쓰지 않는다. #227에서 `협력`은 `c2`의 단독 어간이고 이번 답에 없었다. 기존 코드의 `unanswered_promoted_positive`와 같다.

답하지 않은 수요 가정 “높은 관심을 가질 것이다”는 `UNKNOWN`으로 남는다. `충족`이나 `충분`으로 바꾸지 않는다. 기존 긍정 어간은 `충분`, `충족`, `개선`이다.

`provenance`가 `SIMULATION`인 문장을 `confirmedFacts`에 넣거나 `VERIFIED_FACT`로 두면 실패다. 그 문장의 사실 상태는 `FOUNDER_CLAIM`으로 남을 수 있다. #227은 `confirmedFacts`가 비어 있었다. 그 한 가지가 미확인 보존 통과를 대신하지 않았다.

질문 밖 문장은 아래를 모두 지킨다.

- `questionId`가 없으면 어떤 질문에도 붙이지 않는다. 알 수 없는 id도 붙이지 않는다.
- 그 질문은 `open`으로 남는다.
- 원문과 `provenance`, `epistemicStatus`를 보존한다.
- 다음 통합 재분석에는 `stagePairs` 밖 `unlinkedStatements`로 전달한다.
- 같은 원문을 다시 보내도 피드백 행을 하나 더 만들지 않고, 보충 해시도 바꾸지 않는다.
- 미연결 문장만으로 미완료 단계를 완료로 두지 않는다. 그 저장의 GPT 호출은 0회다.

## 5. Judgment Delta

| 유형 | 의미 | 필요한 항목 |
| --- | --- | --- |
| `RETAIN` | 기존 판단을 유지 | 이전 판단 id, 현재 문장, 근거 id, 이유, 남은 불확실 |
| `MODIFY` | 기존 판단을 고침 | 위 항목과 이번 답의 구간 id |
| `ADD` | 새 판단 | 이번 답 또는 미연결 문장의 구간 id |
| `DEFER` | 근거 부족으로 유보 | 미확인 id, 이유, 남은 불확실. 문장에 유보가 드러남 |
| `RESOLVE` | 이슈를 검증으로 닫음 | 그 이슈를 닫는 구간의 id |

근거 id가 없으면 기존 긍정 판단을 `RETAIN`하지 않는다. #227의 `judgmentKept: true`와 빈 `cites`는 실패다. 기존 코드의 `delta_bad_cite`, `uncertainty_not_kept`, `judgment_not_withheld`, `invented_judgment_improvement`와 같은 사건이다.

사업 잠재력과 실행 가능성은 다른 문장이다. 잠재력을 `RETAIN`하려면 그 근거가 `ASSUMPTION`이나 미답 질문이 아니어야 한다. #227의 `충족` 문장은 입력에도 이번 답에도 없으므로 `RETAIN`할 수 없다. 실행 가능성은 공급 계약 없음의 구간을 근거로 `DEFER`한다. 협력 가능성은 미답 `q1`을 근거로 `DEFER`한다. `RESOLVE`는 아니다.

가격을 말한 구간이 “없다”이면 수익 모델은 `UNKNOWN`으로 남는다. 1차의 참가비·수수료 가설을 확정 수익으로 `RETAIN`하지 않는다.

## 6. Priority Selection

세 검사가 모두 통과한 뒤에만 선택 결과를 저장한다. 모델이 후보를 2개 이상 만들고 `selectedCandidateId`로 하나 고른다. 코드는 id가 후보 안에 있는지만 본다.

후보 비교는 모델이 이유에 적는다.

- 지금 사업에서 중요한 미해결인가
- 이미 답한 문제인가
- 이번 답으로 새로 드러난 위험인가
- 다른 미해결보다 먼저 볼 가치가 있는가
- 전체 판단에 어떤 영향을 주는가

실패 조건:

- 고른 id가 후보에 없음
- 이유에 그 id가 없음
- `verificationPurpose`가 닫힌 질문의 목적과 같음. 단어만 바꾼 문장 포함
- 선택지 집합이 이전 질문의 선택지 집합과 같음
- 세 검사 실패 뒤에 코드가 다른 후보를 골라 넣음

#227에는 선택 응답이 없다. 이 기둥은 계속 NOT TESTED다. 설계가 선택 품질을 통과로 만들지 않는다.

협력 질문이 미답으로 남아 있고 이번 문장이 상품·공급·가격을 말했다면, 다음 목적은 그 미답 질문을 같은 말로 다시 묻는 것이 아니다. 무엇을 고를지는 모델이 정한다. 코드는 “공급을 물어라”처럼 주제를 지정하지 않는다.

## 7. 기존 모듈과의 관계

`evaluateDecisionContract`는 #227 2차 ledger를 거절했다. 그 거절은 유지한다. 바꾸는 것은 입구다.

| 유지 | 제품에 올리지 않음 |
| --- | --- |
| 구간이 원문과 같아야 함 | `buildStateRequest`의 얇은 키만으로 제품 후속을 보냄 |
| 미답 선택 어간을 긍정 판단에 쓰지 않음 | 상태 호출과 선택 호출을 제품의 기본 2회 호출로 만듦 |
| 빈 인용, 유보 없음, `충족` 유지를 실패로 봄 | 실패 뒤 프롬프트를 고쳐 같은 라운드를 다시 호출 |
| 실패 행 재사용, 호출 0회 | 코드가 후보를 선택 |

제품 1회 응답이 네 영역을 한 JSON에 담으면, 같은 검사가 그 JSON을 읽는다. 상태 호출 전용 시스템 문장은 실험 파일에 남긴다. 제품 시스템 문장 `stageReanalysisSystemPrompt`는 이번 설계 승인 전에 고치지 않는다.

## 8. 검사 순서

1. 이번 원문이 요청 JSON에 있는지. 없으면 호출 0회.
2. 응답을 파싱. 파싱 실패는 `failed`, 재호출 없음.
3. Grounding. 구간 불일치, 빈 변화, 답에 없는 긍정.
4. Unknown. 미답의 긍정·부정, `SIMULATION` 출처의 `VERIFIED_FACT` 승격, 구간만으로 한 사실 승격.
5. Delta. 유형, 근거 id, 잠재력과 실행 가능성의 분리.
6. 3번에서 5번이 모두 통과한 경우에만 Selection.
7. 실패 시 sections의 다음 질문을 비운 실패 행을 저장. 성공 시에만 질문 id를 발급해 저장.

1차에도 3번과 4번을 적용한다. 1차에 이전 답이 없으면 Delta의 `ADD`만 허용하고, 입력에 없는 긍정 유지는 실패다.

## 9. 시나리오별 기대

시나리오 표는 `SPRINT-2-IMPLEMENTATION-PLAN.md`의 검증 계획과 같은 12개다. 기대와 실패만 여기 고정한다.

| 시나리오 | 기대 | 실패 |
| --- | --- | --- |
| 최초 사업 입력 | 구간이 있어도 별도 `evidenceId`가 없으면 `VERIFIED_FACT`가 아님 | 수요 증가, 경쟁 유형, 지불자를 확인 사실로 저장 |
| 최초 질문 | 상태 `UNKNOWN`인 가정 중 모델이 고른 하나 | 입력에 없는 긍정 판단을 질문의 전제로 확정 |
| 정상 답변 | `questionId`, `choiceId`, `feedbackId`, 출처가 한 행 | id 없는 답을 그 질문의 답으로 저장. 빈 `choiceId`를 `c1`로 저장 |
| 질문 밖 정보 | `unlinkedStatements`. 질문은 `open`. GPT 0회 | 그 문장으로 질문을 `answered`로 바꿈 |
| 미답 질문 | `UNKNOWN` | 미답을 긍정 또는 부정 판단으로 기록 |
| 공급 계약 없음 | 실행 가능성은 `DEFER`. 구간이 그 문장 | 협력 가능성이 높다고 기록 |
| 가격 미정 | 수익 모델 `UNKNOWN` | 참가비나 수수료를 확정 수익으로 유지 |
| 수요 근거 없음 | 수요 `UNKNOWN` | `충족` 또는 `충분`을 이번 답의 결과로 기록 |
| 모순되는 답 | `MODIFY` 또는 `DEFER`. 근거 id | 이전 긍정 문장을 이유 없이 `RETAIN` |
| 답 누적 | 이전 원문과 상태가 다음 요청에 남음. 새 목적은 닫힌 목적과 다름 | 이전 답을 빼고 같은 목적을 다른 말로 질문 |
| 중복 요청 | 저장된 행 재사용. GPT 0회 | 같은 답으로 추가 호출 |
| SIMULATION | `provenance` `SIMULATION`, `epistemicStatus` `FOUNDER_CLAIM`. `confirmedFacts`는 빈 배열 | `FOUNDER_INPUT`으로 바꾸거나 `VERIFIED_FACT`로 저장 |

## 10. 아직 관찰되지 않은 것

선택 품질, 3차, 4차, 질문 밖 정보의 재분석 반영, 1차 구간 검사의 실제 모델 출력은 이 설계 단계에서 호출하지 않는다. 통과로 적지 않는다.
