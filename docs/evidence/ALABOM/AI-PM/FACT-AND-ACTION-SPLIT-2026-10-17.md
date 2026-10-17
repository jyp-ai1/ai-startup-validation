# 사실 판정과 다음 행동의 분리 — 2026-10-17

전체 판정은 BLOCKED다. 전략 방향은 유지한다. 인증 세션과 소유자 워크스페이스를 우회하지 않았다. GPT·Gemini 원문을 만들지 않았다. 사용자 실행 결과를 만들지 않았다. PR #199와 PR #200은 병합하지 않았다. Production SHA는 `0b465226`이다. 외부 AI API 0건, 웹 자동화 0건, 신규 유료 서비스 0건. 호스팅 청구서는 읽지 않았다.

쿠키 호스트는 `.vercel.com`, `vercel.com`, Preview 호스트 하나다. ChatGPT, OpenAI, Gemini, Google 계정 호스트는 없다. `experiments/business-judgment-poc`에 있는 파일은 `prompt.txt`, `path1.json`, `path4.json`뿐이다.

## 1. 비교 경로는 붙여넣기다

`business-validation/page.tsx`, `validation-journey-screen.tsx`, `web-review-panel.tsx`, `web-review-comparison.ts`, `stored-model-judgment.ts`는 `getResearchProvider`를 호출하지 않는다. 비교는 사용자가 붙여 넣은 두 문자열을 보관하고 규칙으로 나눈다. 이 구조는 API를 호출하지 않는 전략과 맞다. 실제 GPT 웹 분석과 Gemini 웹 반론의 품질은 이 구조만으로 검증되지 않는다.

## 2. 세 신호는 서로 다른 값이다

| 신호 | 어디서 | 무엇으로 결정되는가 | 이번 판정 |
| --- | --- | --- | --- |
| 모델 Fact와 입력 대조 | `judgeStoredModelOutput`의 `fact` | 입력 구간에 원장·결제·입금·세금계산서가 없으면 false. 모델 Fact true를 그대로 쓰지 않는다 | 저장된 path1·path4와 `prompt.txt`에서 PASS |
| `verifiedFact` | `judgeStoredModelOutput`, `compareWebReviews`, `recordExternalAnalysis` | 모두 상수 false. 원장 유무나 두 원문의 합의로 바뀌지 않는다 | 상수가 false인 것은 확인. 사실 검증 완료로 세지 않음 |
| 다음 검증 행동 | `compareWebReviews`의 `nextAction`만 | 충돌이 있으면 한 문장, 없으면 다른 문장. 둘 다 주문 원장에서 모회사·계열사 매출과 그 밖 매출을 나누고, 예상 연매출을 받은 돈으로 세지 말라고 한다 | 고정 문장은 있다. 실제 두 원문에 맞는지 NOT RUN |
| 단일 모델 판정의 다음 실험 | `judgeStoredModelOutput` | 필드가 없다 | FAIL. 누락과 Fact 판정에서 멈춘다 |

`web-review-panel.tsx`는 `verifiedFact` 문장과 `다음 검증 행동`을 다른 요소로 그린다. 화면이 둘을 한 칸에 합치지는 않는다. 그 다음 행동을 사용자가 실행한 기록은 없다.

## 3. 테스트가 말한 것과 말하지 않은 것

7파일 44개, 종료 코드 0. 코드를 더 바꾸지 않고 다시 실행했다.

`stored-model-output-repro.test.ts` 9개는 path1·path4의 수신, 입력 행 누락, 판정 Fact를 본다. `recordExternalAnalysis` 테스트는 노트 문장에 `"Fact": true`가 있어도 상수 `verifiedFact`가 false임을 본다. 그 PASS는 다음 실험 제안의 통과가 아니다.

`web-review-comparison.test.ts`는 시험 문장으로 합의, 충돌, 근거 부족, `nextAction`, 슬롯 저장과 재조회를 따로 expect한다. 그 문장은 GPT 웹과 Gemini 웹에서 받은 원문이 아니다. 저장·재조회 PASS는 실제 두 원문 비교의 통과가 아니다.

## 4. 막힌 항목

| 지시 | 판정 | 이유 |
| --- | --- | --- |
| GPT 웹 실행 후 원문 보존, 이어서 Gemini 반론 보존 | BLOCKED | 인증된 브라우저 세션 없음. `prompt.txt`를 넣지 않음 |
| 두 원문을 ALABOM에 넣고 합의·충돌·근거 부족·다음 행동을 실제 내용으로 평가 | NOT RUN | 넣을 원문 없음 |
| 사실 판정과 다음 실험 제안을 각각 검증 | 사실 판정은 저장 파일에서 PASS. 다음 실험은 두 칸 비교의 고정 문장만 있고 실제 원문 평가는 NOT RUN. 단일 모델 판정에는 다음 실험 필드가 없어 FAIL | 상수 `verifiedFact: false`를 완료로 쓰지 않음 |
| 실패 5 정정 문장 제출 | BLOCKED | 소유자 프로젝트와 Supabase `dbReady` 없음. 로직 미수정 |
| PR #199·#200 병합과 Production 검증 | NOT RUN | 병합하지 않음. `/ko/business-validation`은 Production에서 404 |
