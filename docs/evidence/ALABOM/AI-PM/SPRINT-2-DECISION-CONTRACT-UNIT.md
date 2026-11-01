# Sprint 2 판단 계약 단위 검증

2026-11-01 21:26 KST. PR #226.

구현은 승인된 두 파일에 있다. 제품 리뷰 파일 `ai-pm-review.ts`는 수정하지 않았다. 실험 B 하니스 `ai-pm-experiment-b.ts`는 수정하지 않았다. `runStageReanalysis`와 `runFirstReview`는 호출하지 않았다. 화면, DB 스키마, Founder 프로젝트, Production, ADR은 바꾸지 않았다. GPT 실호출은 0회다. Sprint 2 PASS는 선언하지 않는다. Sprint 3은 시작하지 않는다.

| 파일 | 역할 |
| --- | --- |
| `apps/web/features/business-validation-journey/lib/ai-pm-decision-contract.ts` | 순수 검사. 모델을 호출하지 않고 후보를 고르지 않는다 |
| `apps/web/features/business-validation-journey/lib/ai-pm-decision-contract-run.ts` | 실행기. `currentAnswer`가 없거나 요청 JSON에 실리지 않으면 `chat`을 호출하지 않는다. Grounding, Unknown, Delta 중 하나라도 실패하면 선택 호출을 보내지 않는다 |
| `apps/web/features/business-validation-journey/lib/__tests__/ai-pm-decision-contract.test.ts` | 단위 검증. 네트워크 없음 |

실험 B 단위 테스트 9건도 같은 실행에서 통과했다. 그 파일은 변경하지 않았다.

## 1. 단위 결과

`pnpm exec vitest run features/business-validation-journey/lib/__tests__/ai-pm-decision-contract.test.ts`

9건 통과. 실패 0건. 소요 40ms. 모델 호출 0회.

기준 답은 `체험을 원하는 고객과 상품 구성은 구상이다. 공급 계약과 가격은 없다.`이다. 닫힌 질문은 `양조장 체험에 대한 수요가 충분한가?`이고, 긍정 선택지는 `양조장 체험에 대한 수요가 충분하다`이다.

| CPO 단위 조건 | 결과 | 호출 | 실패 코드 |
| --- | --- | --- | --- |
| 답변 누락 | 통과 | 0 | `answer_missing`. 저장 `callCount` 0, `evidence` `not_run` |
| 답변 구간 불일치 | 통과 | 1 | `span_mismatch`. `selectionAllowed` false |
| 미답변 수요 질문을 긍정 사실로 변환 | 통과 | 1 | `unanswered_promoted_positive` |
| SIMULATION의 confirmedFacts | 통과 | 1, 그리고 빈 배열 장부는 이 코드 없음 | 항목이 있으면 `simulation_promoted`. 유효 장부는 `[]` |
| 수요 불확실 유지 | 통과 | 1 | `kept`를 빼면 `uncertainty_not_kept` |
| 사업성 판단 유보 | 통과 | 1 | `withheld`를 빼면 `judgment_not_withheld` |
| 앞의 셋 중 하나 실패 | 통과 | 선택 0 | `selectionAllowed` false |
| 셋이 통과한 장부 | 통과 | 상태 1, 선택 1 | 상태 요청과 선택 요청의 `currentAnswer`가 답 전문과 같다. 선택 id는 모델이 적은 `c-supply` 그대로다. 판단 문장에 `유보`가 있다 |
| 실패 행 재조회 | 통과 | 재조회 0 | 같은 부모와 같은 답은 저장된 실패 행을 돌려준다 |

요청 JSON에 `currentAnswer` 키가 없으면 `requestCarriesAnswer`가 거짓이다. 실행기는 그 요청으로 `chat`을 호출하지 않는다.

유효 장부가 유지하는 읽기는 다음이다.

| 항목 | 기록 |
| --- | --- |
| 체험 상품 | 구간 `체험을 원하는 고객과 상품 구성은 구상이다` |
| 공급 | 구간 `공급 계약과 가격은 없다` |
| 가격 | 구간 `가격은 없다` |
| 수요 질문 | `uq-demand` 미답변. `kept`가 불확실을 유지하고 이 id를 가리킨다 |
| 실제 구매 | `uf-purchase` 미확인 |
| 사업성 | `withheld`가 유보를 적고 위 미확인 id를 가리킨다 |
| 확인된 사실 | `[]` |

답에 없는 `충분`으로 사업성이 개선됐다고 적은 문장은 실패다. 선택 호출은 나가지 않는다.

## 2. 실호출

GPT 실호출은 NOT STARTED다. 이 실행 환경에는 `GPT_API_KEY`가 없고 `VERCEL_ENV`도 없다. 1차부터 4차까지의 단일 체인은 보내지 않았다. 프롬프트는 단위 검증 뒤에 수정하지 않았다. 실패 라운드 재호출은 없다.

Priority Selection 품질은 NOT TESTED다. 단위 검사가 본 것은 선택 호출의 차단과, 통과한 장부에서 선택 요청이 답 원문을 담는지다. 모델이 고른 우선순위의 품질은 실호출 전이다.

## 3. 상태

| 항목 | 상태 |
| --- | --- |
| 실험 B | FAIL |
| Sprint 1 | PASS |
| Sprint 2 | PARTIAL |
| 판단 계약 설계 | 승인 |
| 구현 범위 | 승인 |
| 구현 | 단위 검증까지 |
| GPT 실호출 | NOT STARTED |
| Priority Selection 품질 | NOT TESTED |
| Sprint 3~6 | 대기 |
| Production | LOCKED |
