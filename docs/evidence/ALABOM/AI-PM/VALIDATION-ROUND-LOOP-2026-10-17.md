# 반복 루프 연결 — 2026-10-17

전체 판정은 BLOCKED다. 전략 방향은 유지한다. 이 변경은 시험 문장으로 회차 저장과 다음 입력을 잇는다. 실제 GPT 웹 조회와 Gemini 웹 반론을 실행하지 않았다. 원문 파일을 만들지 않았다. PR #199와 PR #200은 병합하지 않았다. Production SHA는 `0b465226`이다. 외부 AI API 0건, 웹 자동화 0건, 신규 유료 서비스 0건. 호스팅 청구서는 읽지 않았다.

코드가 시험 문장 루프를 저장하는 것과, 실제 두 웹 원문으로 사업 판단을 끝내는 것은 별개다.

## 1. 호출 경로

| 항목 | 구분 | 근거 |
| --- | --- | --- |
| GPT 원문 입력·저장 | 화면 연결, 저장 연결 | `storeLoopOriginal`가 열린 회차의 `gptText`와 `loop-rN-gpt` 노트를 남긴다. 세션 키 `alabom.validationJourney.v1` |
| Gemini 원문 입력·저장 | 화면 연결 | GPT 원문이 있을 때만 저장한다. 없으면 거절하고 `GPT 원문 대기`에 남긴다 |
| `compareWebReviews` | 화면 연결 | 두 원문이 함께 있을 때만 `storeLoopOriginal`가 호출한다. provider는 호출하지 않는다 |
| 취합·추가 질문 표시 | 화면 연결 | 저장된 `aggregation`과 `unresolvedQuestions`를 패널이 그린다 |
| Founder 피드백 저장 | 화면 연결, 저장 연결 | `submitRoundFeedback`. 증빙 검토가 아니며 `factStatus`는 `미확인` |
| 다음 회차 입력 | 화면 연결 | 다음 회차 `businessSnapshot`에 사업 입력, 피드백, 미해결 질문을 넣는다 |
| 재조회와 새 원문 | 화면은 `GPT 원문 대기`까지. 실제 웹 조회는 인증 때문에 BLOCKED | 피드백 제출은 GPT 조회 완료가 아니다 |
| 회차별 재조회 | 저장 연결 | 닫힌 회차의 원문과 `aggregation`은 다음 저장에서 바꾸지 않는다. 새로고침 후 같은 세션 JSON으로 돌아온다 |
| `storeWebReview` | 라이브러리만 존재 | 패널이 호출하지 않는다. 같은 슬롯을 덮어쓰는 기존 함수다 |
| `judgeStoredModelOutput` | 라이브러리만 존재 | 화면 컴포넌트가 import하지 않는다 |
| `reaggregateOpenRound` | 라이브러리만 존재 | 새 원문 없이 `updated: false`를 반환한다. 화면 버튼은 없다 |
| 실제 GPT·Gemini 웹 실행 | 인증 때문에 BLOCKED | 원문 파일이 없고 계정 쿠키가 없다 |

쉬는 상태로 저장하는 값은 `GPT 원문 대기`, `Gemini 원문 대기`, `Founder 검토 대기`, `다음 회차 준비 완료`, `보류`다. `피드백 대기`는 `Founder 검토 대기`와 같다. `재조회 준비`는 다음 회차가 `GPT 원문 대기`로 열리는 것이다. `취합 대기`는 저장하지 않는다. 두 원문이 있을 때만 취합을 기록한다.

## 2. 시험 문장에서 확인한 것

규칙 테스트 `validation-round-loop.test.ts` 9개와 기존 회귀를 함께 실행했다. 10파일 62개, 종료 코드 0.

로컬 `http://127.0.0.1:3010/ko/business-validation`에서 테스트 가설로 여정을 열고, 구분을 테스트 문장으로 두었다.

- Gemini만 넣으면 `GPT 원문이 없다`로 거절한다.
- GPT 다음 Gemini를 넣으면 회차는 `Founder 검토 대기`가 되고 사실 상태는 `미확인`이다.
- 피드백 문장에 원장과 10억이 있어도 사실 상태는 `미확인`이다. 메시지는 GPT 원문이 아직 없다고 말한다.
- r1은 `다음 회차 준비 완료`로 남고 r2는 `GPT 원문 대기`다. r2 입력에 피드백과 미해결 질문이 있다.
- 새로고침 뒤 같은 회차 목록과 입력이 남는다.

이 원문은 GPT 웹과 Gemini 웹에서 받은 문장이 아니다.

## 3. 막힌 항목

| 지시 | 판정 |
| --- | --- |
| 시험 문장 회차 저장·피드백·다음 입력 | PASS |
| 이전 회차 유지, GPT 없는 Gemini 거절, 새 원문 없는 재취합 거절, 무증빙 승격 거절 | PASS. 시험 문장 |
| 실제 GPT 원문과 Gemini 반론 | BLOCKED |
| 실제 원문으로 다음 회차 웹 재조회 | BLOCKED |
| 검증 기준 충족으로 반복 종료 | NOT RUN. 명시적 보류만 있다 |
| 실패 5 | BLOCKED |
| 병합과 Production | NOT RUN |
