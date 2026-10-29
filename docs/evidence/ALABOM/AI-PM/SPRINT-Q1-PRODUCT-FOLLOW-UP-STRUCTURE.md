# Sprint Q1 product follow-up request

제품 `buildFollowUpRequest`가 만드는 요청 객체다. 모델을 호출하지 않았다. 앞서 기록한 직접 호출 `q1-incremental-structure-2026-10-29`는 다시 실행하지 않았고, 그 기록을 통과로 바꾸지 않았다. 증분 반영, 2차 품질, 저장·복원, 화면 검증은 하지 않았다. 1차 검증 완료가 아니다. 기본값은 `quality-2`다. Production 잠금은 유지했다.

## 요청 객체

파일 `sprint-q1-product-follow-up-request.json`. `modelInvoked`는 false다. 1차 분석은 quality-14 양조장 출력 SHA `8c5968ed6023f04bfa2172884ddaf4a47c02127a`를 제품 파서 `parseSections`로 읽은 `ReviewSections`다. 그 출력의 품질 통과가 아니다.

답변 구분은 `synthetic-test-data`다. 테스트용 합성 데이터이며 실제 창업자 답변이 아니다.

| 항목 | 요청 키 | 이 객체 |
|---|---|---|
| 최초 사업 원문 | `originalInput` | quality-14에 보낸 사업 원문 |
| 전체 1차 분석 | `previousAnalysis` | 섹션 전체와 `analysis`. `founderFacts` 3개, 선택지 4개, `summary`, `judgmentDetail`, `revenueModel` |
| 1차 질문 | `previousQuestion` | `체험 프로그램과 마케팅 지원 중 어느 쪽을 먼저 검증할지?` |
| 선택 답변과 구분 | `founderChoice` + `answerOrigin` | `체험 프로그램을 먼저 검증할 것`, `choiceId` `c1`, `answerOrigin` `synthetic-test-data` |
| 추가 설명 | `founderSupplement` | 예약 고객, 가격, 계약, 확정된 양조장이 없다고 적은 합성 문장 |
| 판단 규칙 | `separationRules`와 시스템 문장 | 과거 출력을 다시 쓰지 말 것, 답변은 검증된 사실이 아님, 합성 데이터는 실제 창업자 답변이 아님, 근거 없으면 사실로 올리지 말고 가설로 남길 것, 근거 없이 가설이 강화되었다고 쓰지 말 것 |

최대 출력 토큰은 800이다. 1차 검토의 2400을 따르지 않는다. 입력 예산만 1차의 3000과 따로 두었다. 1차 분석 객체가 그 3000에서 잘리지 않게 하기 위해서다. 이번 객체는 잘리지 않은 JSON이다.

`answerOrigin`을 생략하면 요청은 `founder-input`이 된다. 고지는 저장된 입력이며 검증된 사실이 아니라는 문장이다. 휴면 경로 `runFollowUpReview`는 `answerOrigin`을 받지 않으므로, 그 경로가 요청을 만들면 `founder-input`이다. 이번 턴에 그 경로를 호출하지 않았다.

## 제품 경로는 그대로 닫혀 있다

답 저장은 `POST /api/ai-pm-review/feedback`만 보내고 `modelCalls: 0`이다. 화면은 `/api/ai-pm-review/follow-up`을 호출하지 않는다. `runFollowUpReview`는 이 함수를 쓰지만, 화면에서 답 저장만으로 실행되지 않는다.

## 테스트

모델 호출이 아니다.

| 기록 | 결과 |
|---|---|
| `ai-pm-review.test.ts` | 19 passed |
| `ai-pm-quality-compare.test.ts` | 17 passed |
| `ai-pm-quality-scenarios.test.ts` | 7 passed |

계약 테스트는 `followUpStructureCoverage`다. 통과는 요청 키의 포함이다. 모델 품질도 증분 반영도 아니다.

로컬 `next build`는 이번 턴에 실행하지 않았다. Preview 비교 스크립트의 run id는 `q1-incremental-structure-2026-10-29` 그대로다. 그 객체는 이미 `RECORDED`라 이 변경의 Preview 빌드가 모델을 다시 호출하지 않는다.

## 하지 않은 관문

| 관문 | 상태 |
|---|---|
| 제품 요청 구조 | 요청 객체와 계약 테스트를 제출한다. CPO 재검토 전 |
| 증분 반영 | **NOT RUN** |
| 2차 품질 | **NOT RUN** |
| 저장·복원 | **NOT RUN** |
| 화면 Q9·Q10 | **BLOCKED**. 2026-10-29 18:07 KST. Vercel CLI logged out. Preview `GET /workspace` HTTP 401 |

1차 세 입력의 품질 복구도 별도 관문이다.
