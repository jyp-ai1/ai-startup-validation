# Sprint Q1 Incremental Review Structure Gate

이 파일은 2026-10-29 18:30 KST의 직접 호출 기록이다. 실행 id는 `q1-incremental-structure-2026-10-29`다. CPO는 이후 제품 요청 구조 관문을 SHA `eed29780cf9b43f2f580bb003bd7c0142c053a77`에서 PASS했다. 이 객체를 증분 반영 통과로 쓰지 않는다.

2차 증분 호출을 구성해 모델에 한 번 보낸 기록이다. 제품의 2차 리뷰는 열지 않았다. 반환 문장은 증분 반영 판정도 품질 판정도 아니다. 1차 검증 완료가 아니다. 기본값은 `quality-2`다. Production 잠금은 유지했다. quality-8부터 quality-14, quality-2 독립 호출 원문은 바꾸지 않았다.

## 합성 데이터

창업자 답변은 테스트용 합성 데이터다. 실제 창업자가 제공한 답변이 아니고, 실제 사업 검증 결과가 아니다.

| 항목 | 내용 |
|---|---|
| 구분 | `synthetic-test-data` |
| 고지 | 테스트용 합성 데이터. 실제 창업자 답변이 아니며 실제 사업 검증 결과가 아니다. |
| 1차 원문 | `COMPARE_BUSINESS_INPUT`. 양조장 체험과 온라인 마케팅 지원 |
| 1차 분석 | quality-14 양조장 모델 출력. 실행 SHA `8c5968ed6023f04bfa2172884ddaf4a47c02127a`. 품질 통과가 아니다 |
| 1차 질문 | `체험 프로그램과 마케팅 지원 중 어느 쪽을 먼저 검증할지?` |
| 합성 선택 | `체험 프로그램을 먼저 검증할 것`. 1차 출력의 choices에 있던 문자열 |
| 합성 추가 설명 | 예약 고객, 가격, 계약, 확정된 양조장은 없다고 적은 테스트 문장 |

## 호출 경로

제품 경로가 아니다.

`apps/web/scripts/preview-quality-compare-once.mjs`가 Preview 빌드에서 `incremental-structure-request.json`을 읽고 OpenAI chat completions를 직접 호출했다. `POST /api/ai-pm-review/follow-up`은 호출하지 않았다. 화면의 답 저장은 `POST /api/ai-pm-review/feedback`만 보내고 `modelCalls: 0`이다. `runFollowUpReview`는 여전히 `buildFollowUpRequest`를 쓴다. `buildIncrementalStructureRequest`는 그 함수에 연결하지 않았다.

`productFollowUpInvoked: false`는 Q10 통과가 아니다.

## 2차 입력에 들어 있는 항목

실행 SHA `ca72261c9a3623707e8d2e94eafe90a05178d2c9`. 2026-10-29 18:30:43–18:30:50 KST. 모델 `gpt-4o-mini-2024-07-18`, temperature 0.2, max tokens 2400, JSON. prompt 1264, completion 566, finish `stop`. 원문 `sprint-q1-incremental-structure-recorded.json`.

| 항목 | 사용자 JSON 키 | 이번 호출 |
|---|---|---|
| 최초 사업 원문 | `originalInput` | 있음. `COMPARE_BUSINESS_INPUT` |
| 이전 1차 분석 | `previousAnalysis` | 있음. quality-14 양조장 객체 |
| 이전 질문 | `previousQuestion` | 있음. 1차 `nextQuestion`과 같다 |
| 선택 답변 | `founderChoice.label` | 있음. `dataClass`는 `synthetic-test-data` |
| 추가 설명 | `founderSupplement` | 있음. 합성 고지를 포함한다 |
| 구분 규칙 | `separationRules`와 시스템 문장 | 있음. 과거 출력을 다시 쓰지 말 것, 답변은 검증된 사실이 아님, 근거 없으면 사실로 올리지 말 것, 판단·가설·검증 우선순위를 새 값으로 적을 것 |

스키마 함수는 `buildIncrementalStructureRequest`. 포함 여부는 `incrementalStructureCoverage`.

## 제품 컴포저의 빈 칸

`buildFollowUpRequest`는 이번 호출에 쓰지 않았고, 바꾸지 않았다. 선택 답변을 `choiceAnswer`로 넣어도 사용자 JSON에는 다음만 있다.

| 항목 | 제품 `buildFollowUpRequest` |
|---|---|
| 원문 | 있음. `originalInput` |
| 이전 질문 | 있음. `previousReview.nextQuestion` |
| 추가 설명 필드 | 있음. `supplement` |
| 전체 1차 분석 | 없음. `founderFacts`, `choices`, `revenueModel`이 `previousReview`에 없다 |
| 라벨이 붙은 선택 | 없음. `choiceAnswer`를 보내지 않는다 |
| 구분 규칙 | 없음. 답변을 사실이 아니라고 적지 않는다 |

시스템 문장은 짧은 키 `problem, target_customer, solution, business_model, validation_metric, nextQuestion`을 요구한다. 1차 분석 키 집합이 아니다. 최대 토큰은 800이다.

## 반환과 1차 출력의 차이

같은 문서가 아니다. 아래는 필드 비교다. 증분 반영 검증이 아니고 품질 검증이 아니다.

바뀐 칸:

| 칸 | 1차 | 2차 |
|---|---|---|
| `judgment` | `미확인` | `체험 프로그램의 수요 검증이 필요하다.` |
| `founderFacts` | 입력 문장 셋 | `[]` |
| `judgmentChange` | 없음 | `체험 프로그램의 수요 검증이 필요하다는 판단이 추가되었다.` |
| `hypothesisChange` | 없음 | `체험 프로그램의 수요에 대한 가설이 강화되었다.` |
| `priorityChange` | 없음 | `체험 프로그램 검증이 우선시되었다.` |

그대로인 칸: `summary`, `customer`, `problem`, `value`, `operatingModel`, `alternatives`, `differentiation`, `payer`, `revenueModel`, `market`, `competition`, `operations`, `profitability`, `strengths`, `risks`, `assumptions`, `evidenceToChange`, `inferences`, `nextVerification`, `nextQuestion`, `nextQuestionReason`, `choices`.

`assumptions`는 `미확인` 그대로다. `nextVerification`은 `체험 프로그램의 수요 검증 및 온라인 마케팅 효과 검증` 그대로다. `nextQuestion`은 1차 질문 그대로다. 합성 선택 문장은 `founderFacts`에 들어가지 않았다. 1차의 입력 문장 셋은 비워졌다.

## 테스트와 모델 호출

둘은 별개다.

| 기록 | 결과 | 모델 호출 |
|---|---|---|
| `ai-pm-quality-compare.test.ts` | 17 passed | 아니다 |
| `ai-pm-review.test.ts` | 18 passed | 아니다 |
| Preview 객체 `q1-incremental-structure-2026-10-29.json` | `RECORDED`, call `succeeded` | 맞다. 1회 |

단위 테스트가 여섯 키의 포함과, 답 저장 함수가 `chat(`를 호출하지 않는다는 점을 본다. 그 성공은 모델 호출 성공이 아니다.

이번 턴의 로컬 `next build`는 실행하지 않았다.

## 하지 않은 관문

| 순서 | 대상 | 상태 |
|---|---|---|
| 1 | 구조. 2차 호출을 구성하고 실행 | 기록을 제출한다. CPO 판정 전 |
| 2 | 증분 반영 | **NOT RUN** |
| 3 | 2차 품질 | **NOT RUN** |
| 4 | 저장·복원 | **NOT RUN** |
| 5 | 화면 | **BLOCKED**. Q9·Q10은 후순위 |

Q9·Q10은 2026-10-29 18:07 KST 기준으로 막혀 있다. `npx vercel whoami`는 `Logged out`. Preview `GET /workspace`는 HTTP 401. 이번 턴에 인증을 다시 보지 않았고, 우회하지 않았다. 로그인 후 제품으로 들어가는 현상이 인증 성공인지 이동 경로 문제인지는 정하지 않았다.

## 남은 결함

- 제품 `buildFollowUpRequest`는 전체 1차 분석, 라벨이 붙은 선택, 구분 규칙이 없다. CEO 승인 전에 그 경로를 제품에 붙이지 않았다.
- 2차 원문은 판단 문장과 변화 문장 셋을 새로 적고, 가설 칸과 검증 우선순위 칸과 다음 질문은 1차 값을 유지했다. 이 차이를 반영 통과로 두지 않는다.
- `founderFacts`가 빈 배열이 되었다.
- 1차 품질 복구는 여전히 세 입력이 함께 통과하지 않았다. 기본값은 `quality-2`다.
- 파서 수용은 품질 통과가 아니다. 이번 2차 원문에 파서·저장 라운드트립을 돌리지 않았다.
