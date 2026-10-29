# Sprint Q1 product follow-up request

제품 요청의 계약을 `parsed-sections-1`로 고정한 기록이다. 이 파일의 요청 객체는 모델을 호출하지 않는다. CPO는 2026-10-29 21:12 KST에 SHA `eed29780cf9b43f2f580bb003bd7c0142c053a77`의 구조 관문을 PASS했다. 직접 호출 `q1-incremental-structure-2026-10-29`는 `RECORDED`로 남고, 증분 반영 기록이 아니다. 1차 검증 완료가 아니다. 기본값은 `quality-2`다. Production 잠금은 유지했다.

## 계약

2차 모델에 넘기는 분석은 파서가 저장한 섹션 전체다. 1차 모델 JSON 원문의 바이트 복사는 이 계약이 아니다.

| 칸 | 계약 |
|---|---|
| `originalInput` | 창업자가 넣은 사업 원문 전체. 모델 원문이 아니다 |
| `previousAnalysis` | `parseSections`가 저장한 `ReviewSections` 전체. `analysis`가 있으면 그 객체도 포함한다 |
| `analysisContract` | `parsed-sections-1` |
| 1차 모델 JSON 원문 | 요청에 넣지 않는다. 저장 행의 `rawContent`로 남는다 |

요청 문장: `previousAnalysis는 파서가 저장한 분석 섹션 전체다. 1차 모델 JSON 원문의 바이트 복사가 아니다. originalInput은 창업자 사업 원문 전체다.`

파서가 바꾸는 값은 저장 계약이다. 문자열 `미확인`은 배열이 되고, 섹션 `judgment`는 요약 문장이고, 모델의 `judgment`는 `analysis.judgmentDetail`에 있다. 선택 라벨은 유지되고 id가 붙는다. `answerHint`는 제품 고정 문장이다. 이 요청이 모델 원문과 바이트가 다른 것은 이 계약에서 누락이 아니다.

## 불일치 검사

`followUpStructureCoverage`는 형태만 본다. 원문을 다른 문장으로 바꿔도 `originalInput`이 true다. 값 비교는 `followUpRequestMismatches`다. 구현은 `apps/web/features/business-validation-journey/lib/ai-pm-review.ts`의 `followUpRequestMismatches`다. 저장 섹션 키는 `followUpPreviousAnalysis`가 만든 객체의 키를 돌고, `analysis`가 객체이면 그 안의 키도 돈다.

테스트 원문은 `apps/web/features/business-validation-journey/lib/__tests__/ai-pm-review.test.ts`의 `puts the stored analysis and the answer origin on the product follow-up request`다. 맞는 요청의 불일치 목록은 `[]`다. 그 테스트는 저장본 `previousAnalysis`의 `analysis`를 뺀 키 전부와 `analysis` 안의 키 전부를 바꾼 값, 빈 값, 없는 키로 각각 넣는다. 빈 값이 저장값과 같으면 빈 값 검사는 건너뛴다. 이 입력에서 그 경우는 `previousAnalysis.claimConfirmation`뿐이고 저장값이 `null`이다. `analysis` 키 자체를 지우면 이름은 `previousAnalysis.analysis`다.

저장 섹션 키: `customer`, `problem`, `market`, `revenueModel`, `execution`, `risks`, `uncertain`, `hypotheses`, `judgment`, `nextQuestion`, `nextQuestionReason`, `answerHint`, `claimConfirmation`.

분석 키: `summary`, `value`, `operatingModel`, `payer`, `competition`, `operations`, `profitability`, `strengths`, `assumptions`, `evidenceToChange`, `founderFacts`, `inferences`, `judgmentDetail`, `choices`, `alternatives`, `differentiation`, `nextVerification`.

같은 테스트가 스칼라로 바꾼 값·빈 값·없는 키를 보는 이름: `analysisContract`, `analysisContractNote`, `originalInput`, `previousQuestion`, `previousAnalysis`, `previousAnalysis.customer`, `previousAnalysis.problem`, `previousAnalysis.revenueModel`, `previousAnalysis.judgment`, `previousAnalysis.nextQuestion`, `previousAnalysis.hypotheses`, `previousAnalysis.analysis`, `previousAnalysis.analysis.summary`, `previousAnalysis.analysis.founderFacts`, `previousAnalysis.analysis.choices`, `previousAnalysis.analysis.judgmentDetail`, `founderChoice`, `founderChoice.label`, `founderChoice.choiceId`, `founderChoice.answerOrigin`, `founderChoice.otherText`, `founderSupplement`, `supplement`, `separationRules`, `answerOrigin`, `answerOriginNotice`. 시스템 문장에서 다섯 규칙을 하나씩 빼면 `system:`과 그 규칙 문장이 불일치 이름이다.

실행한 키 목록은 `sprint-q1-product-follow-up-request.json`의 `comparedKeys`다. 그 목록은 이 테스트가 각 키를 바꿔 `followUpRequestMismatches`가 그 이름을 반환한 기록이다.

`previousAnalysis` 객체 자체를 지우면 이름은 `previousAnalysis`다. 원문만 바꾸면 `originalInput`만 해당하고 이름 `previousAnalysis`는 남지 않는다. `previousAnalysis.customer` 같은 하위 이름은 그 검사와 별개다.

## 출처

출처 분리는 `buildFollowUpRequest`와 `buildSyntheticFollowUpRequest`에 있다. 합성 생성은 `answerOrigin`이 `synthetic-test-data`가 아니면 `synthetic_answer_origin_required`를 던진다. `founder-input`도 던진다.

`buildFollowUpRequest`는 출처가 없으면 `follow_up_answer_origin_required`를 던진다. 없는 출처가 `founder-input`이 되지 않는다. 허용 목록 밖이면 `follow_up_answer_origin_invalid`다.

저장된 피드백 경로 `runFollowUpReview`만 `answerOrigin: 'founder-input'`을 직접 넘긴다. 그 함수는 `buildSyntheticFollowUpRequest`를 쓰지 않는다. 라우트 파일 `apps/web/app/api/ai-pm-review/follow-up/route.ts`에는 `answerOrigin` 문자열이 없고, 패널은 `/api/ai-pm-review/follow-up`을 호출하지 않는다. 이번 턴에 그 경로를 호출하지 않았다.

두 출처의 고지는 다르다. 합성은 실제 창업자 답변이 아니라고 적고, 저장된 입력은 검증된 사실이 아니라고 적는다. 다섯 규칙도 둘 다 사실로 올리지 말라고 한다. 합성 선택 문장과 추가 설명은 `founderFacts`에 없다.

요청 파일 `sprint-q1-product-follow-up-request.json`의 `modelInvoked`는 false다. 테스트가 그 파일과 `buildSyntheticFollowUpRequest`의 반환을 같다로 비교한다. 비교에 쓴 1차 출력은 quality-14 양조장 SHA `8c5968ed6023f04bfa2172884ddaf4a47c02127a`다. 그 출력의 품질 통과가 아니다. 답변 구분은 `synthetic-test-data`다. 화면은 `/api/ai-pm-review/follow-up`을 호출하지 않는다. 답 저장의 `modelCalls`는 0이다.

## 요청에 들어 있는 다섯 규칙

사용자 JSON `separationRules`와 시스템 문장이 같은 다섯 문장이다.

1. 이전 1차 분석은 과거 출력이다. 새 분석과 구분하고 통째로 다시 출력하지 않는다.
2. 선택한 답변과 추가 설명은 현재의 판단·정보이며 검증된 사실이 아니다.
3. answerOrigin이 synthetic-test-data이면 테스트용 합성 데이터다. 실제 창업자 답변으로 취급하지 않는다.
4. answerOrigin이 founder-input이어도 근거가 없으면 사실로 승격하지 않는다. 가설로 남긴다.
5. 판단, 가설, 검증 우선순위는 답변 때문에 달라지는 부분만 갱신한다. 근거 없이 가설이 강화되었다고 쓰지 않는다.

## 1차 원문과 요청의 값

`previousAnalysis`는 파서가 저장하는 `ReviewSections`와 같다. 모델 원문 JSON과 바이트가 같지는 않다. 테스트가 원문 키와 요청 값을 하나씩 비교했다.

| 모델 원문 | 요청 | 관계 |
|---|---|---|
| `customer`, `problem`, `market`, `revenueModel`, `value`, `operatingModel`, `payer`, `competition`, `operations`, `profitability`, `alternatives`, `differentiation`, `nextQuestion`, `nextQuestionReason`, `nextVerification`, `summary`, `founderFacts`, `inferences`, `strengths` | 같은 이름의 분석 칸, `execution`은 `operatingModel` | 값이 같다 |
| `choices` | `analysis.choices[].label` | 문장이 같다. 요청은 `c1`–`c3`와 `other` id를 붙인다 |
| `risks`, `assumptions`, `evidenceToChange` | 배열 | 원문은 문자열 `미확인`이고 요청은 `["미확인"]` |
| `judgment` | `analysis.judgmentDetail` | 원문 `미확인`이 여기 있다 |
| `summary` | `previousAnalysis.judgment`와 `analysis.summary` | 요약 문장이 판단 칸에도 들어간다. 원문 `judgment`와 다른 칸이다 |
| 없음 | `answerHint` | 제품이 넣는 고정 문장이다. `선택하거나 직접 적습니다. 확인된 사실과 계획을 구분합니다.` |
| 없음 | `claimConfirmation` | `null` |

선택 `체험 프로그램을 먼저 검증할 것`은 `founderChoice.label`과 `answerOrigin` `synthetic-test-data`로 같이 있다. 그 문장과 합성 추가 설명은 `founderFacts`에 없다. `founderFacts`는 원문의 세 문장과 같다.

추가 설명이 빈 문자열이면 `founderSupplement`도 빈 문자열이다. 선택이 없으면 `founderChoice`는 `null`이다.

## 테스트

모델 호출이 아니다.

| 기록 | 결과 |
|---|---|
| `ai-pm-review.test.ts` | 19 passed |
| `ai-pm-quality-compare.test.ts` | 17 passed |
| `ai-pm-quality-scenarios.test.ts` | 7 passed |

2026-10-29 21:06 KST에 같은 세 파일을 `WRITE_COMPARE_FIXTURE` 없이 다시 실행했다. 43 passed. 픽스처의 `request`는 이전 객체와 같고, 추가된 칸은 `comparedKeys`다. `modelInvoked`는 false다. 로컬 `next build`는 실행하지 않았다. 그 시점의 Preview 비교 run id는 `q1-incremental-structure-2026-10-29`였다.

2026-10-29 22:30 KST에 `ai-pm-review.test.ts` 20 passed, `ai-pm-quality-compare.test.ts` 18 passed. 모델 호출은 없다. `founderAnswer`는 `choice`, `supplement`, `source`, `status` 객체다. 선택만 있거나 `source`가 `answerOrigin`과 다르면 실패한다. 다음 Preview run id는 `q1-incremental-reflection-source-2026-10-29`다. 그 객체는 아직 없다.

## 하지 않은 관문

| 관문 | 상태 |
|---|---|
| 제품 요청 구조 | PASS. CPO 2026-10-29 21:12 KST. SHA `eed29780cf9b43f2f580bb003bd7c0142c053a77` |
| 증분 반영 | FAIL. `q1-incremental-reflection-grounds-2026-10-29`는 `founderAnswer`가 선택만 담아 실패. 다음 호출 계약은 `reflection-output-4`. `SPRINT-Q1-INCREMENTAL-REFLECTION-GROUNDS.md` |
| 2차 품질 | **NOT RUN** |
| 저장·복원 | **NOT RUN** |
| 화면 Q9·Q10 | **BLOCKED**. 2026-10-29 18:07 KST. Vercel CLI logged out. Preview `GET /workspace` HTTP 401 |
