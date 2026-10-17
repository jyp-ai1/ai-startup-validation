# 출력 계약 분리 — 2026-10-17

전체 판정은 BLOCKED다. 전략 방향은 유지한다. 이 변경은 붙여넣기 규칙의 출력 칸을 나눈 것이다. 실제 GPT 웹 원문과 Gemini 웹 원문을 비교하거나 배포한 것이 아니다. 인증 세션과 소유자 워크스페이스를 우회하지 않았다. 원문을 만들지 않았다. 사용자 실행 결과를 만들지 않았다. PR #199와 PR #200은 병합하지 않았다. Production SHA는 `0b465226`이다. 외부 AI API 0건, 웹 자동화 0건, 신규 유료 서비스 0건. 호스팅 청구서는 읽지 않았다.

## 1. 다섯 단계 중 코드가 가진 것

| 단계 | 이번 코드 | 판정 |
| --- | --- | --- |
| 주장 추출 | 비교는 기준 S1–S6·A1–A2로 두 문자열의 태도를 나눈다. 단일 모델 판정은 입력 구간의 A2·S3 행이 모델 문장에 없으면 그 행을 복사한다 | 규칙 범위 PASS. 실제 웹 원문 아님 |
| 합의·충돌·근거 부족 | `compareWebReviews`가 세 배열을 따로 둔다. 합의 문장에 “검증된 사실이 아니다”가 붙는다 | 시험 문장 PASS. 실제 원문 NOT RUN |
| 사실 상태 | `factStatus`는 `미확인`만 반환한다. `근거 확보`, `검증 완료`, `반증됨`은 타입에만 있다 | 상수 `verifiedFact: false`와 분리됨. 상태 전이는 없음 |
| 다음 검증 실험 | `nextExperiment`에 가설, 자료, 방법, 비용, 기간, 성공, 실패가 있다. 비용과 기간은 글자 `미확인` | 규칙 범위 PASS. 실행 기록 없음 |
| 실행 결과 회수 | `rejudgeAfterFounderExecution`은 입력 문장을 무시하고 `미확인` / `보류` / `verifiedFact: false`만 반환한다 | 유지·수정·중단은 하지 않음. BLOCKED |

## 2. 단일 모델 판정과 비교 판정은 다른 반환이다

`judgeStoredModelOutput`의 반환은 `fact`, `factStatus`, `verifiedFact`, `nextExperiment`를 각각 가진다.

- `fact`는 입력 구간에 원장·결제·입금·세금계산서가 있을 때만 모델 Fact를 따른다.
- 그 단어가 입력 구간에 있어도 `factStatus`는 `미확인`이고 `verifiedFact`는 false다. 단어 일치는 검증이 아니다.
- `nextExperiment.hypothesis`는 모델 출력에 없는 A2·S3 입력 행을 적고, 모델 Fact와 판정 Fact가 별개라고 적는다.
- 저장된 `path1.json`, `path4.json`은 고치지 않았다. 원문 누락과 모델 Fact true는 테스트가 그대로 본다.

`compareWebReviews`의 반환은 `factStatus`, `nextExperiment`, `nextAction`, `verifiedFact`를 각각 가진다. `verifiedFact`는 false다. `factStatus`는 `미확인`이다.

두 원문이 있을 때 `nextAction`은 고정 두 문장 중 하나만 고르지 않는다. 충돌이 있으면 “모델 문장으로 고르지 않는다” 뒤에, 없으면 “합의한 문장도 원장이 없으면 사실이 아니다” 뒤에, 그 비교에서 나온 충돌·근거 부족 라벨을 붙인다. 비용과 기간은 `미확인`이다. 이 연결은 시험 문장과 로컬 화면에서 확인했다. GPT 웹·Gemini 웹에서 받은 원문에는 적용하지 않았다.

공개 화면 `validation-journey-screen.tsx`는 `judgeStoredModelOutput`을 import하지 않는다. 단일 모델 실험 칸은 라이브러리와 규칙 테스트에 있고, 비교 패널에는 비교 결과의 칸만 그린다.

## 3. 테스트 세 갈래

규칙 테스트는 `apps/web/vitest.config.ts`의 명시 목록이다. 8파일 46개, 종료 코드 0. 이전 44개에 `verification-outcome.test.ts` 2개가 더해졌다. 여기에는 질문 넘김, 데모, 워크스페이스 로그인 경계가 포함된다. provider 동일 객체와 비교 경로의 provider 비호출도 여기 있다.

실제 원문 비교 관문은 `vitest.gates.config.ts`만 실행한다. `gpt-web-original.txt`와 `gemini-web-original.txt`가 없어서 통과한다. 그 통과는 비교 품질 PASS가 아니다. 판정은 BLOCKED다.

사용자 행동 관문도 같은 설정이다. `founder-execution.json`이 없어서 통과한다. 그 통과는 실행 회수 PASS가 아니다. 판정은 BLOCKED다.

## 4. 로컬 화면에서 본 것

`http://127.0.0.1:3010/ko/business-validation` 첫 화면에는 비교 패널이 없다. 테스트 가설을 채우고 이해를 시작한 뒤에 패널이 나온다.

원문이 없을 때 사실 상태는 `미확인`, `verifiedFact`는 false, 다음 실험 자료는 GPT 웹 원문, 비용과 기간은 `미확인`이다.

시험 문장으로 S3·A2가 갈리는 두 칸을 넣고 구분을 `테스트 문장`으로 저장한 뒤:

- 사실 상태는 `미확인`이다.
- 충돌 목록에 S3 예상 연매출 10억과 A2가 있다.
- 합의는 S1이고, 문장에 검증된 사실이 아니라고 적힌다.
- 다음 실험 가설은 그 충돌 두 항목을 적고, 어느 모델 문장도 사실로 고르지 않는다고 적는다.
- 다음 행동 문장은 그 충돌과, 두 문장에 없는 S2·S4·S5·S6·A1을 대상에 포함한다.
- 새로고침 뒤 보관한 문장과 같은 다음 행동이 남는다.

이 문장은 웹에서 받은 GPT·Gemini 원문이 아니다. 페이지 오류는 없었다.

## 5. 막힌 항목

| 지시 | 판정 | 이유 |
| --- | --- | --- |
| 출력 계약을 사실 판정과 다음 실험으로 분리 | 규칙과 로컬 시험 문장에서 PASS | 실제 웹 원문에는 적용하지 않음 |
| 다음 행동이 입력의 충돌·근거 부족과 연결되는지 | 시험 문장과 로컬 화면에서 PASS | 실제 웹 원문 NOT RUN |
| 실제 GPT·Gemini 원문 비교 | BLOCKED | 두 원문 파일이 없음. 관문 통과는 부재 확인 |
| 사용자 행동 결과 회수 | BLOCKED | 실행 기록 없음. 회수 함수는 보류만 반환 |
| 실패 5 정정 문장 | BLOCKED | 로직 미수정. 소유자 워크스페이스 없음 |
| PR #199·#200 병합과 Production | NOT RUN | 병합하지 않음. Production `/ko/business-validation`은 라우트가 없어 404 |
