# 무비용 AI PM 엔진 및 단일 행동 UX 검증 요약

작성: 2026-10-16T09:20Z  
범위: 문서 정리만. 이 파일을 쓰는 턴에 제품 코드, 엔진 순서, 모델 호출, PR #199 병합, Production 배포는 없다.  
Production 잠금 SHA: `0b465226`  
PR: https://github.com/jyp-ai1/ai-startup-validation/pull/199 (초안)

이 문서는 아래 기록을 한곳에 모은 것이다. 새 실험 결과는 없다.

| 구간 | 커밋 | 기록 |
| --- | --- | --- |
| 외부 모델 기각 | `02a319ea` | `BUSINESS-JUDGMENT-DECISION.txt`, `BUSINESS-JUDGMENT-POC.txt` |
| 규칙 엔진 한도·가정 | `134667d9` | `RULE-ENGINE-AC16-AC5.txt`, `experiments/rule-engine-ac/trace.json` |
| 엔진 동결 | `27756fb6` | `RULE-ENGINE-FREEZE.txt` |
| 진단 UX 방향 2 | `4e013fe2` | `DIAGNOSTIC-UX-DIRECTION.txt` |
| 단일 행동 화면 | `55586a62` | `SINGLE-ACTION-SCREEN.txt`, `experiments/rule-engine-ac/single-action-screen.json` |
| 화면 동결 | `96f3c4a9` | `SINGLE-ACTION-FREEZE.txt` |

## 1. 엔진 정합성

규칙 엔진은 `134667d9`에서 멈춘다. 이후 화면 커밋 `55586a62`는 `verification-action.ts`, `journey-engine.ts`, `plan-journey.ts`, `decide-next-question-from-review.ts`를 다시 고치지 않았다.

질문 반복. `MAX_SAME_GAP_ASKS_BEFORE_YIELD`는 2다. 첫 부분 답(닫히지 않은 질문 0회)은 같은 공백을 한 번 더 묻는다. `problemJtbd`가 PARTIAL이고 `payer`가 CLOSED인 상태에서 닫히지 않은 질문이 2회이면 다음 대상은 `businessOneLiner`다. 제외 목록은 `payer`, `problemJtbd`다. 이유 문장은 `yield problemJtbd after 2 unclosed asks (cap 2)`다. 재현 시각은 2026-10-16T08:30:15Z다.

AC16. 닫힌 `payer`는 다음 대상이 되지 않는다. 이 검사는 한도를 넣기 전에도 마지막 대상이 `businessOneLiner`였다.

사실 승격. `PlanClaim.claimStatus`는 `CLAIM` 또는 `ASSUMPTION`이다. Fact 상태는 없다. `ledgerChecked`는 false만 가능하다. `verifiedFact`는 가설 판단에서 false다. 판단 상태는 `judgment_deferred`다. 점수와 「사업성 높음」은 만들지 않는다.

S1–S6.

| 항목 | 상태 |
| --- | --- |
| S1 문서상 매출 2,000만 원 | `c-sales`, `CLAIM`, 원장 검증 아님 |
| S2 구매전환율 3.8~5.7% | 원문 문장만 있음. 별도 상태 노드 없음. Fact 아님 |
| S3–S6 예상 매출·모회사 회원 계획 | 원문에 그 문장이 있을 때만 `c-s3`~`c-s6`, `ASSUMPTION`, `forecast` |

선택 전이. 모회사·계열사 판매 → 지원 필수 → 「모회사 채널 밖에서 고객을 확보한 기록이 있습니까?」 → 없다 → 질문 종료. 비중을 모름 → 재구매 추적 질문. 고객을 「기업 총무팀」으로 수정 → `u-customer-scope`. 「예상 10억은 받은 매출이 아니다」는 매출 비중 질문을 다시 열지 않고 가정 4개를 유지한다.

RIDM. 유료 고객 없음 → 월 9,900원 이유 미확인 → 질문 종료. 전환율과 예상 매출은 실적이 아니다.

로컬 검사. `plan-journey.test.ts` 16건, `ai-pm-loop-v3.test.ts` 73건. 2026-10-16T08:33:19Z 통과.

이미 있던 실패. `v3-runtime-certification`의 V3-03, V3-12와 `core-final-stabilization`의 `validationTestability` 품질 검사는 한도를 넣기 전 결정 함수에서도 같은 실패다. 인증 스위트 전체를 통과로 두지 않는다.

규칙 엔진이 하지 않는 일. 임의 사업계획서를 읽고 컨설턴트 문장을 쓰지 않는다. 수동 GPT에서 본 판단 문장 수준에 도달하지 않는다.

## 2. 외부 모델

제품 엔진으로 두지 않는다. 근거 실행은 `82252e97`, 방향 기록은 `02a319ea`다. 표본은 LMULM 한 세트, 각 경로 1회다. 모델 JSON은 제품 상태 함수에 넣지 않았다. `liveModelCall`, `verifiedFact`, `validated`, `realAnalysisSuccess`, `systemVerified`는 false 고정이다.

1번. 익명 `POST https://text.pollinations.ai/openai`. Authorization 없음. 2026-10-16T07:32:42Z. HTTP 200. 10.876초. 응답 모델 `gpt-oss-20b`. id `pllns_ad8b0ebe46b1c7533e046a2c0e703f36`. JSON 파싱 1/1. Fact false. Claim은 A1만 옮겼다. A2와 S3 예상 매출은 출력에 없다. 수동 GPT 수준으로 두지 않는다.

4번. 로컬 `qwen2.5:3b`. `POST http://127.0.0.1:11434/api/chat`. 2026-10-16T07:32:20Z. HTTP 200. 21.685초. JSON 파싱 1/1. Fact true. 입력에 원장이나 결제 증거가 없었다. Next_Action은 지원 없이도 매출을 유지할 증거를 찾으라고 했고, Claim의 유지 불가와 방향이 반대였다. 1차 후보에서 내린다. 같은 3B 사업 입력을 반복하지 않는다.

두 출력 모두 함정 표현(70%, 고급 필기구, 시장 점유율, 9,900, Pre-revenue, VALIDATED, 재구매)은 없었다. 파싱 성공은 품질 합격이 아니다.

## 3. 단일 행동 UX

방향은 2번이다. 신호등, 리스크 스코어, 매트릭스, 여러 항목 체크리스트는 기각했다. 화면 함수는 `presentSingleDiagnosticAction`이다. 질문이 남아 있으면 그 질문 하나가 다음 행동이다. 질문이 끝나면 엔진 문단의 첫 블록과 그 블록의 성공 기준만 보여 준다.

LMULM. 모회사·계열사 판매, 지원 필수, 채널 밖 기록 없음.

- 다음 행동: 주문 원장에서 모회사·납품 매출과 일반 소비자 매출을 나눈다. 2,000만 회원은 모회사 회원수다.
- 성공 기준: 주문 원장에서 모회사·납품 매출과 일반 소비자 매출이 나뉜 한 건. 모회사 회원수는 그 원장이 아니다.

엔진 문단에는 재구매와 채널 밖 고객 블록이 남아 있다. 화면과 검증 메모에는 없다. CPO는 2026-10-16T09:18Z에 이 순서를 바꾸지 않기로 했다. 채널 밖 고객 기록은 세 번째 블록으로 남는다.

RIDM. 유료 고객 없음, 월 9,900원 이유 미확인.

- 다음 행동: 최초 유료 고객 1명의 결제 원문을 가져온다. 전환율 가정은 실적으로 세지 않는다.
- 성공 기준: 최초 유료 고객 1명의 결제 원문. 날짜, 금액, 낸 사람이 적혀 있다. 전환율 가정은 실적이 아니다.

사용량 측정 문장은 엔진 문단에만 있고 화면에는 없다.

브라우저. `http://localhost:3000/ko/business-validation`. `next-action`, `verification-action`, `decision-next`, `answer-effect-next`가 같은 한 문장을 보였다. 로컬 검사 `present-single-action.test.ts` 3건, `plan-journey.test.ts` 16건. 2026-10-16T09:12:29Z 통과.

성공 기준을 말했다는 사실만으로 Fact, `verifiedFact`, `ledgerChecked`가 바뀌지 않는다. 판단은 Hold다.

## 4. 비용과 동결

이 스트림에서 기록된 호출은 유료 API 키를 쓰지 않았다. 1번은 Authorization 없는 익명 응답이다. 4번은 이미 있던 로컬 런타임이다. 새 GPU, 새 서버, 유료 구독, 유료 사용량 청구를 이 기록에 남기지 않았다. 회계 시스템 전표 대조는 이 문서의 범위가 아니다.

PR #199는 초안이다. 병합하지 않았다. Production `0b465226`은 바꾸지 않았다. 화면 동결 커밋은 `96f3c4a9`다.

## 5. 동결을 유지하는 방법

- 규칙 엔진 파일과 행동 우선순위를 고치지 않는다.
- `presentSingleDiagnosticAction` 이후에 대시보드, 점수, 체크리스트를 붙이지 않는다.
- 외부 모델 출력을 상태 승격 입력으로 연결하지 않는다. `liveModelCall`을 true로 두지 않는다.
- 1번과 4번의 사업 프롬프트를 다시 보내지 않는다.
- PR #199를 병합하지 않고 Production에 배포하지 않는다. 초안을 유지한다.
- 새 구현은 CPO/CEO가 병합 또는 우선순위 변경을 문서로 지시하기 전에 시작하지 않는다.

## 6. 나중에 병합을 지시받으면 볼 검사

아래는 지금 실행한 배포 절차가 아니다. 병합 지시가 생긴 뒤에 같은 브랜치에서 다시 볼 목록이다.

1. `apps/web`에서 `plan-journey.test.ts`, `ai-pm-loop-v3.test.ts`, `present-single-action.test.ts`를 다시 실행한다. 기존 통과 건수가 줄면 병합하지 않는다.
2. AC5: 닫히지 않은 `problemJtbd` 질문이 0이면 같은 공백, 2이면 `businessOneLiner`. AC16: 닫힌 `payer`는 다음 대상이 아니다.
3. S3–S6은 ASSUMPTION이다. S1은 CLAIM이다. `ledgerChecked`와 `verifiedFact`는 false다. 판단은 `judgment_deferred`다. 다운로드 문서에 점수와 「사업성 높음」이 없다.
4. LMULM 화면 경로 모회사·계열사 판매 → 지원 필수 → 채널 밖 기록 없음. 보이는 다음 행동은 주문 원장 분리 한 건이다. 재구매 문장과 채널 밖 고객 문장은 화면 본문에 없다.
5. RIDM 화면 경로 유료 고객 없음 → 월 9,900원 미확인. 보이는 다음 행동은 최초 결제 원문 한 건이다. 사용량 측정 문장은 화면 본문에 없다.
6. `liveModelCall`은 false다. 외부 모델 JSON을 `acceptPastedAnalysis`나 주장 상태에 넣지 않는다.
7. V3-03, V3-12, `validationTestability` 품질 검사의 기존 실패를 이번 동결이 고친 것으로 적지 않는다. 그 세 건을 병합 조건으로 올릴지는 별도 지시가 있어야 한다.
8. Production SHA가 `0b465226`에서 바뀌는 배포는 그 지시 안에 배포가 적혀 있을 때만 한다.

## 7. 한계

이 스택은 질문 반복을 끊고, 예상 매출을 사실로 올리지 않으며, 화면에는 검증 행동 하나를 보여 준다. 창업자 서술을 읽어 컨설턴트 수준의 판단 문장을 만들지는 못한다. S2는 상태 노드가 아니다. 외부 모델 두 경로는 각 1회 표본이다. 인증 스위트 전체에 이미 실패한 검사가 있다.
