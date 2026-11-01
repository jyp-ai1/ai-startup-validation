# Sprint 2 종료 검증

2026-11-01 18:05–18:06 KST. PR #226. 구현 `2ee4b076`.

CTO 자체 평가: **PARTIAL**. Sprint 2 PASS는 선언하지 않는다. Sprint 3은 시작하지 않았다. Production 배포는 하지 않았다. Founder 프로젝트는 읽거나 쓰지 않았다.

테스트 프로젝트는 sqlite `gpt-sprint2-closeout-project`다. 사용자는 `gpt-sprint2-closeout-sim`이다. 답변은 SIMULATION이다. 이전 실패 실행 `chatcmpl-EfLOkyOcJrd5Z6jdlZi72ayH6tI73`, `chatcmpl-EfL634bsKmQI3rCHAF4p4G6vloZMf`, `chatcmpl-EfKuXRvp8EvzqhOx1oHKq94a4RQch`는 다시 호출하지 않았다.

## 1. 구현 커밋과 변경 파일

`2ee4b076` `fix(ai-pm): separate stated records from the next review objective`

- `apps/web/features/business-validation-journey/lib/ai-pm-review.ts`
- `apps/web/features/business-validation-journey/lib/__tests__/ai-pm-consulting-stage.test.ts`
- `apps/web/features/business-validation-journey/lib/__tests__/ai-pm-real-gpt-sprint2-closeout.live.test.ts`
- `apps/web/scripts/run-web-build.sh`

설계 `b0df4122`의 한 호출 구조를 적용했다. 요청의 `businessState`는 `statedRecord`, `areaStatus`, `priorReview`다. 응답은 `objectiveCandidates` 2개 이상, `selectedCandidateId`, `selectionReason`을 질문 앞에 둔다. `selectedCandidateId`는 모델이 고른 후보의 `candidateId`다. 코드는 후보 배열에서 다음 질문을 고르지 않는다. 질문 문장과 개수는 모델이 정한다.

저장 컬럼은 늘리지 않았다. 후보와 선택 이유는 응답 원문에 남고, 저장 판정은 기존 `stage_questions_repeated`를 포함한 기존 규칙을 쓴다. 새 저장 이슈 코드는 추가하지 않았다. 단위 테스트 112건은 2026-11-01 18:03 KST에 통과했다.

## 2. 최종 기준

| 기준 | 판정 | 근거 |
| --- | --- | --- |
| 사업 맥락 | 유지됨 | 최초 아이디어, SIMULATION 답 9문장, 확인 사실 `[]`, 1차 가설 3개가 2차 요청에 있다 |
| 검토 목적 | 실패 | 선택 후보 `c1`의 목적이 방금 물은 고객층 질문과 같다. `overlapsReviewedObjective`는 false다 |
| 질문 발전 | 실패 | 다음 질문 3개가 1차 질문 3개와 같다 |
| 반복 상담 | 3·4차 NOT RUN | 2차 행이 실패해 다음 부모로 쓰지 않았다 |
| 시스템 안정성 | 유지됨 | 답 저장 호출 0, 단계 호출 1, 중복 재사용, 재조회가 실패 행을 유지 |

질문 문장이 바뀐 것으로 통과 처리하지 않는다. 이번 질문은 바뀌지 않았고, 가격·공급의 새 판단으로 이어지지 않았다.

## 3. 호출

구간 2026-11-01 18:05:33–18:05:59 KST. gitSha `2ee4b076c29e68efc248094f357806f3b29e2894`. 모델 `gpt-4o-mini-2024-07-18`. temperature 0.2. maxTokens 2400.

| 차수 | 실행 | 검토 | 부모 | 토큰 | 저장 | 호출 |
| --- | --- | --- | --- | --- | --- | --- |
| 1차 실호출 | `chatcmpl-EfLnLLowJvK1vYZOoMw9ppeGI9FAN` | `cce569eb-9c22-452b-9728-9fec3a1937f1` | 없음 | 3,692 / 861 / 4,553 | succeeded | 1 |
| 답 저장 3건 | 없음 | 같은 1차 행 |  | 0 | modelCalls 0 | 0 |
| 2차 실호출 | `chatcmpl-EfLnSgFokSDcF9RHGzYxAAfqCMg9w` | `dc179cc8-5d17-40f3-8a0a-0d998f139e1c` | `cce569eb-9c22-452b-9728-9fec3a1937f1` | 16,569 / 1,739 / 18,308 | `stage_questions_repeated` | 1 |
| 중복 재검토 | 모델 미호출 | 같은 2차 행 재사용 |  | 0 | duplicateReused true | 0 |
| 3차 | NOT RUN |  |  |  |  | 0 |
| 4차 | NOT RUN |  |  |  |  | 0 |

1차는 저장된 원문 재생이 아니다. `COMPARE_BUSINESS_BODY`로 `runFirstReview`를 실호출했다. 2차 실패 뒤 프롬프트를 고치거나 다시 호출하지 않았다.

## 4. 1차 사업검토

판단: `사업 모델은 관광객의 수요에 부합하며, 전통주 체험을 통해 차별화된 가치를 제공할 수 있다. 그러나 초기 투자와 마케팅 비용이 수익성에 영향을 미칠 수 있다.`

`nextQuestion` 필드: `전통주 체험에 대한 관광객의 관심도는 어느 정도인가?`

실제로 저장된 질문과 선택지:

1. `전통주 체험을 원하는 고객층은 어떤 특성을 가지고 있는가?` — 내국인 관광객 / 외국인 관광객 / 모두 포함 / 기타
2. `양조장 체험 외에 어떤 추가 서비스를 제공할 수 있는가?` — 음식 페어링 서비스 / 전통주 교육 프로그램 / 기념품 판매 / 기타
3. `온라인 마케팅에서 어떤 채널을 가장 효과적으로 활용할 수 있을까?` — 소셜 미디어 / 블로그 및 웹사이트 / 이메일 마케팅 / 기타

## 5. SIMULATION 답

세 질문에 같은 연습 답을 붙였다. Founder 답변은 없다.

`SIMULATION. 체험을 원하는 고객과 상품 구성은 구상이다. 공급 계약과 가격은 없다. 이 답은 연습 입력이고 확인된 기록이 아니다.`

답 저장 3건의 `modelCalls`는 0이다.

## 6. 2차 요청에 전달된 맥락

사용자 JSON의 첫 키는 `businessState`다.

`statedRecord.originalIdea`는 최초 문장이다. `전통주`와 `SIMULATION`이 요청에 있다. `confirmed`는 `[]`다. 답 문장은 9개다. 같은 세 문장이 질문 3개에 각각 붙었다.

`areaStatus` 배열 순서는 우선순위가 아니다.

| areaId | status | basis |
| --- | --- | --- |
| customer | claim | answer |
| problem | not_analyzed | no_evidence |
| product | not_analyzed | field |
| supply | not_analyzed | field |
| price | claim | answer |
| revenue | not_analyzed | no_evidence |
| market | not_analyzed | no_evidence |
| marketing | not_analyzed | field |
| operations | not_analyzed | no_evidence |
| risk | not_analyzed | no_evidence |

상품·공급·마케팅의 저장 문장이 `아직 분석되지 않았다`이면 답에 `상품`과 `공급`이 있어도 `not_analyzed`다. 가격은 저장 칸이 없고 답에 `가격`이 있어 `claim`이다.

`priorReview.judgment`는 1차 판단이다. `reviewedObjectives`는 위의 질문 3개다. `hypotheses`는 `관광객들이 전통주 체험에 관심이 높을 것이다`, `양조장과의 협력이 원활할 것이다`, `온라인 마케팅이 효과적일 것이다`다. `unresolved`와 `resolved`는 `[]`다. 운영 문장 `양조장과의 협력, 체험 프로그램 개발 및 온라인 마케팅 전략 수립.`과 위험 3개는 `priorReview`에 있고 `areaStatus`에는 없다.

스키마 required에 `objectiveCandidates`와 `selectedCandidateId`가 있다. 시스템 문장에 후보 생성과 선택 지시가 있다.

## 7. 2차 후보와 선택

| id | areaId | objective | overlapsReviewedObjective |
| --- | --- | --- | --- |
| c1 | customer | 전통주 체험을 원하는 고객층은 어떤 특성을 가지고 있는가? | false |
| c2 | product | 양조장 체험 외에 어떤 추가 서비스를 제공할 수 있는가? | false |
| c3 | marketing | 온라인 마케팅에서 어떤 채널을 가장 효과적으로 활용할 수 있을까? | false |

`selectedCandidateId`는 `c1`이다. 후보 목록 안에 있다. 선택 이유: `고객층에 대한 정보가 부족하여 이를 우선적으로 검증해야 한다.` 선택된 objective는 1차 첫 질문과 같다. 세 후보의 objective도 1차 질문 3개와 같다. 겹침 표시는 세 후보 모두 false다.

다음 질문도 그 세 문장이다. 선택지에는 `아직 핵심을 정하지 못했다`가 추가됐다. `verificationPurpose`는 `고객층에 대한 구체적인 정보가 필요하다.`다.

`verifiedFacts`는 `[]`다. `resolvedIssues`는 `[]`다. `unresolvedIssues`는 고객층, 추가 서비스, 마케팅 채널의 정보 부족이다. `unverifiedClaims`에는 연습 답의 구상 문장과, 답이 아닌 2번·3번 질문 문장이 들어 있다.

`updatedJudgment`: `사업 모델은 관광객의 수요에 부합하며, 전통주 체험을 통해 차별화된 가치를 제공할 수 있다. 그러나 고객층, 추가 서비스, 마케팅 채널에 대한 구체적인 정보가 부족하다.`

이전 판단의 첫 문장은 유지되고 둘째 문장은 바뀌었다. 저장 오류는 `stage_questions_repeated` 하나다. `samePurposeAsPrior`는 true다.

## 8. 저장과 재조회

재조회 2행.

- `cce569eb-9c22-452b-9728-9fec3a1937f1` succeeded, error null, parent null
- `dc179cc8-5d17-40f3-8a0a-0d998f139e1c` failed, error `stage_questions_repeated`, parent `cce569eb-9c22-452b-9728-9fec3a1937f1`

2차 재조회의 `nextQuestion`은 null이고 질문 배열은 비어 있다. `verifiedFacts`는 `[]`다. 실패 행은 수정하지 않았다.

## 9. 요청·응답 원문

전체 요청과 응답은 `docs/evidence/ALABOM/AI-PM/sprint-2-closeout.json`이다. 마커 종류는 `live_gpt_sprint2_closeout`다. `founderProjectTouched`는 false다. 비밀 문자열은 원문에 없다.

## 10. 근본 원인과 잔여 작업

참조 관계는 동작했다. 모델이 `c1`을 골랐고 그 id는 후보에 있다. 코드가 A, B, C 중 하나를 고르지 않았다.

후보의 내용이 새 사업 목적이 아니었다. 모델은 `reviewedObjectives`의 질문 문장을 objective로 복사하고 `overlapsReviewedObjective`를 false로 적었다. `areaStatus`의 가격 claim과 상품·공급 not_analyzed는 후보로 쓰이지 않았다. 선택된 목적과 다음 질문이 방금 닫힌 질문이라 기존 저장 규칙이 거절했다. 부모가 실패 상태라 3차와 4차 통합 재검토는 호출하지 않았다.

잔여 작업은 후보 objective가 이미 검토한 목적과 같을 때 겹침 표시를 모델의 자기 보고에만 두는 빈칸이다. strict JSON 스키마는 생성된 문장과 `reviewedObjectives`의 일치를 강제하지 못한다. 이번 검증에서 그 일치를 통과시키려고 새 저장 이슈 코드를 넣거나 프롬프트 문장을 더해 다시 호출하지 않았다. 3·4차 연속 상담은 2차가 저장에 성공한 뒤에만 가능하다.

## 11. CTO 자체 평가

PARTIAL. 세 기록과 후보 참조는 실호출 요청과 응답에서 확인됐다. 사업 판단은 가격·공급의 다음 검토로 발전하지 않았고, 같은 질문을 다시 물었다. 저장, 재조회, 답 저장 0회, 단계 1회, 중복 재사용은 유지됐다. Sprint 2 PASS는 CPO 판정 전이다. Sprint 3은 대기한다.
