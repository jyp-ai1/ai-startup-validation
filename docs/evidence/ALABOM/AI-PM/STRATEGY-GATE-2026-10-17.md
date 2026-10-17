# 전략 방향과 연결 실재 — 2026-10-17

전체 판정은 BLOCKED다. 전략 방향은 유지한다. PR #199와 PR #200은 병합하지 않았고 Production에 배포하지 않았다. Production SHA는 `0b465226`이다. 외부 AI API 0건, 웹 자동화 0건, 신규 유료 서비스 0건. 호스팅 청구서는 읽지 않았다.

테스트 44개 통과는 이 파일 범위의 결과다. 실제 GPT·Gemini 원문 비교, 사용자 여정, 사업 사실의 진실성, Production 검증을 대체하지 않는다.

## 1. 전략 기준

| 기준 | 판정 | 근거 |
| --- | --- | --- |
| 제품 방향 | 유지 | 화면은 사업계획서 작성기가 아니다. `/[locale]/business-validation`은 `내 사업 이해하기` 여정이고, 비교 칸은 그 안의 `WebReviewPanel`이다 |
| AI 독립성 | BLOCKED | GPT 원문과 Gemini 반론 파일이 없다. 쿠키 호스트는 `.vercel.com`, `vercel.com`, Preview 호스트 하나다 |
| 사실 판정 | 규칙 테스트 PASS | 원장·결제·입금·세금계산서가 없으면 모델 Fact true를 판정 Fact로 두지 않는다. `verifiedFact`는 false다. 실제 사업 사실의 진실성은 이 테스트가 증명하지 않는다 |
| 비교 품질 | NOT RUN | 실제 두 원문으로 합의·충돌·근거 부족을 돌리지 않았다 |
| 사용자 경험 | NOT RUN | 두 원문 입력부터 다음 검증 행동까지 사용자 여정을 완료하지 않았다 |
| 기술 품질 | 일부 PASS | 실패 1·2 판정 테스트와 회귀는 통과. 실패 5는 BLOCKED |
| 배포 품질 | NOT RUN | 승인된 병합과 Production 검증이 없다 |
| 비용 | 준수 보고 | API·웹 자동화·신규 유료 0건. 호스팅 금액은 청구서로 확인하지 않았다 |

## 2. 연결 구조

목표 순서는 사용자 입력, GPT 웹 원문, Gemini 웹 반론, ALABOM 비교, 다음 검증 행동이다. 지금 코드가 하는 일은 사람이 붙여 넣은 문장을 보관하고 규칙으로 나누는 것이다. API로 두 모델을 호출하지 않는다. 두 모델이 같은 문장을 써도 `verifiedFact`는 true가 되지 않는다. `web-review-comparison.test.ts`가 그 상수를 확인한다.

| 방식 | 판정 |
| --- | --- |
| 사람이 GPT·Gemini 웹을 직접 실행 | 선택한 방식. 이번 실행은 하지 않음 |
| 그 원문을 ALABOM에 넣고 비교 | 화면과 규칙이 있다. 실제 원문으로는 NOT RUN |
| ALABOM 안에서 두 모델을 API로 호출 | 이 슬라이스에 없다 |
| 증빙 없이 사실로 확정 | 규칙이 막는다. 실제 사업 검증은 아님 |
| 두 모델의 일치를 정답으로 간주 | 규칙이 막는다. 실제 원문으로는 NOT RUN |

## 3. provider 객체와 비교 경로

`getResearchProvider('openai')`와 `getResearchProvider('gemini')`는 같은 OpenRouter 객체이고 id는 `gemini`다. 이것은 `apps/web/features/agents/research/providers/index.ts`의 현재 맵이다. 비교 경로가 이 맵을 쓰지 않는다.

경계 테스트가 다음 파일에 `getResearchProvider`, `openai-counter-review-provider`, `OpenRouterResearchProvider`가 없음을 확인했다.

- `business-validation/page.tsx`
- `validation-journey-screen.tsx`
- `web-review-panel.tsx`
- `web-review-comparison.ts`
- `stored-model-judgment.ts`

같은 객체라는 테스트 결과는 실제 GPT와 Gemini가 연결됐다는 증거가 아니다. 비교는 붙여 넣은 원문만 본다.

## 4. 실패 1·2 증거

`stored-model-output-repro.test.ts` 9개 PASS. 원본 `path1.json` content에는 `A2`와 `예상 연매출 10억`이 없다. 원본 `path4.json`의 모델 Fact는 true다. JSON은 고치지 않았다. 판정 출력은 입력 구간의 빠진 A2·S3 행을 `입력에 있고 모델 출력에 없음`으로 붙인다. 입력 구간에 원장 표지가 없으면 판정 Fact는 false다. `recordExternalAnalysis`의 상수 `verifiedFact: false`는 이 판정의 통과 증거가 아니다. 그 테스트는 노트 문장에 `"Fact": true`가 남는 것을 따로 본다.

이 함수는 다음 실험 행동을 반환하지 않는다. 누락을 표시하는 단계에서 멈춘다.

## 5. 두 원문 비교의 다음 행동

`compareWebReviews`는 합의, 충돌, 근거 부족, `nextAction`을 만든다. 패널은 `다음 검증 행동`으로 그 문장을 보여 준다. 충돌이 있거나 없거나 다음 문장은 주문 원장에서 모회사·계열사 매출과 그 밖 매출을 나누고, 예상 연매출을 받은 돈으로 세지 말라는 것이다. `verifiedFact`는 false다.

이 문장은 고정 규칙이다. 실제 GPT 원문과 Gemini 반론으로 실행한 결과가 아니다. 사용자가 그 다음 행동을 실행했다는 기록도 없다.

## 6. 회귀

7파일 44개 통과, 종료 코드 0. 이전 43개에 비교 경로가 provider를 부르지 않는다는 경계 테스트 1개가 더해졌다. 질문 넘김 파일과 provider 맵 파일은 이 브랜치 diff에 없다.

## 7. 아직 열리지 않은 항목

실패 5는 BLOCKED다. Supabase `dbReady`, 로그인, 소유 프로젝트, Demo가 아닌 편집 가능 루프, 화면 질문 gap `validationTestability`가 갖춰진 뒤에만 정정 문장을 제출한다. 로직은 바꾸지 않았다.

GPT·Gemini 원문은 BLOCKED다. `experiments/business-judgment-poc/prompt.txt`를 인증된 브라우저에서 그대로 실행하지 않았다. 원문을 만들지 않았다. 비교 품질은 평가하지 않았다.

Production 브라우저 여정은 NOT RUN이다.
