# 출력 계약의 연결 — 2026-10-17

전체 판정은 BLOCKED다. 전략 방향은 유지한다. 이 문서는 필드가 있다는 사실을 기능 완료로 세지 않는다. 실제 GPT·Gemini 원문을 만들지 않았다. 사용자 실행 기록을 만들지 않았다. PR #199와 PR #200은 병합하지 않았다. Production SHA는 `0b465226`이다. 외부 AI API 0건, 웹 자동화 0건, 신규 유료 서비스 0건. 호스팅 청구서는 읽지 않았다.

## 1. 생성, 소비, 저장, 미연결

| 필드 | 생성 | 화면 소비 | 저장·재조회 | 미연결 |
| --- | --- | --- | --- | --- |
| `fact` | `judgeStoredModelOutput` | 없음 | 없음. 저장 JSON을 고치지 않는다 | 화면 컴포넌트는 `stored-model-judgment`를 import하지 않는다 |
| `factStatus` | `compareWebReviews`와 `judgeStoredModelOutput`이 `미확인`만 반환 | 비교 패널 `web-review-fact-status` | 저장하지 않는다. `ExternalNote`에 키가 없다. 세션은 journey JSON만 넣고, 비교는 `readWebReview`가 보관 문장으로 다시 계산한다 | 단일 모델 판정의 `factStatus`는 화면에 없다. `external-handoff.ts`와 `judgment-development.ts`에는 이 필드가 없다 |
| `verifiedFact` | 비교 반환, 단일 모델 반환, `storeWebReview`, `recordExternalAnalysis`가 모두 false | 비교 패널이 false를 보이고, 사실 검증이 끝났다는 표시가 아니라고 적는다 | `ExternalNote.verifiedFact`. 핸드오프 붙여넣기도 같은 상수 | 상수가 false인 것은 검증기 동작의 증거가 아니다 |
| `nextExperiment` | 비교는 `experimentForClaims`. 단일 모델은 `experimentForOmissions` | 비교 패널만. 문장에 단일 모델 실험은 이 화면에 없다고 적는다 | 저장하지 않는다. 재조회 때 보관 문장으로 다시 만든다 | `judgeStoredModelOutput`의 실험은 테스트만 호출한다 |
| `rejudgeAfterFounderExecution` / `assessFounderExecution` | `verification-outcome.ts`. 여섯 단계 모두 `미확인` / `보류` / `verifiedFact: false` / `evidenceIgnored: true` | 패널은 `before_execution`만 호출해 보류 이유를 보인다 | 실행 기록을 저장하는 칸이 없다 | 성공·실패·충돌 단계는 화면 입력과 연결되지 않는다. 상태 전이 `FACT_STATUS_TRANSITIONS_IMPLEMENTED`는 false |

`saveJourneyDraft`는 `alabom.validationJourney.v1`에 `JSON.stringify(state)`를 넣는다. 그 안에 비교 결과 객체는 없다.

관리자 브리프의 `nextExperiment`는 `product-os-engine.ts`의 다른 문자열이다. 비교 패널은 그 모듈을 부르지 않는다.

## 2. 상태 의미

| 상태 | 진입 조건 | 현재 코드 |
| --- | --- | --- |
| 미확인 | 증빙 검토 기록이 없다 | 비교와 단일 모델 판정과 재판정이 이 값만 반환 |
| 근거 확보 | 자료 제출 기록과 범위 미확정 기록이 함께 있어야 함 | 미구현. 반환하지 않음 |
| 검증 완료 | 미리 적은 성공 기준과 증빙 대조 기록 | 미구현. 반환하지 않음 |
| 반증됨 | 미리 적은 실패 기준을 충족한 증빙 대조 기록 | 미구현. 반환하지 않음 |

허용된 전이는 없다. 거부 조건은 모델 문장, `verifiedFact: false`, 원장 단어, 성공·실패를 자칭한 문장이다. 그 입력은 보류에 남는다.

## 3. 실험 문장

비교 실험의 비용과 기간은 `미확인`이다. 매출 라벨(S1, S3, S4, S5, A1, A2)이 열린 쟁점일 때만 주문 원장 문장을 넣는다. 전환율과 회원 계획만 열려 있으면 원장 문장을 넣지 않고 측정 기록 또는 계획 문서를 요구한다. 열린 쟁점이 없으면 합의된 매출 주장도 사실이 아니므로 원장 대조를 남긴다.

이 구분은 시험 문장이다. 실제 웹 원문에 적용하지 않았다.

## 4. 테스트

규칙 테스트 9파일 53개, 종료 코드 0. 이전 46개에 연결 3개와 상태·재판정·A2 실험 케이스가 더해졌다.

관문 설정 `vitest.gates.config.ts`는 원문 두 파일과 `founder-execution.json`이 없어서 통과한다. 그 통과는 BLOCKED다.

## 5. 막힌 항목

| 지시 | 판정 | 이유 |
| --- | --- | --- |
| 필드별 생성·소비·저장·미연결 | PASS | 위 표와 `output-contract-connections.test.ts` |
| `verifiedFact: false`를 검증 완료로 표시하지 않음 | PASS | 패널 문장과 상수 반환 |
| 사실 상태가 미확인에 머무름을 화면에 표시 | PASS | 로컬 시험 문장 화면. 실제 원문 아님 |
| 단일 모델 실험을 화면 기능으로 보이지 않음 | PASS | 컴포넌트 import 없음. 패널이 부재를 적음 |
| 재판정 한계를 숨기지 않음 | PASS | 화면은 실행 전 보류만 보인다. 여섯 단계는 테스트에서 모두 보류 |
| 상태 전이 구현 | NOT RUN | 전이를 만들지 않았다. 미구현을 테스트로 고정 |
| 유지·수정·중단 권고 | NOT RUN | 증빙 대조 기록이 없다 |
| 실제 GPT·Gemini 원문 | BLOCKED | 원문 파일 없음. 인증 세션으로 제출하지 않음 |
| 실패 5 | BLOCKED | 로직 미수정. 소유자 워크스페이스 없음 |
| 병합과 Production | NOT RUN | #199·#200 병합 없음 |
