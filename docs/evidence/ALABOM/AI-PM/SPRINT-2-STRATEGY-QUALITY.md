# Sprint 2 — AI 전략 컨설팅 품질

2026-11-01 01:26 KST. Sprint 1 엔진의 질문 수 규칙과 답 연결은 다시 만들지 않았다. 피벗 테이블은 만들지 않았다. Production 배포는 하지 않았다. GPT 실호출은 NOT RUN이다.

이 문서는 Sprint 2 PASS를 선언하지 않는다. JSON이 맞는 것과 전략 문장이 좋은 것은 별개다.

## 1. 이번 변경

단계 재분석이 성공하면 고객, 문제, 가치, 시장, 수익, 위험이 빈 칸으로 저장되고 있었다. 누적 답이 사업 구조를 갱신할 자리가 없었다.

이제 단계 응답은 모델이 사업 전체를 다시 적은 문장을 그 필드에 저장한다.

- `customer`, `problem`, `market`, `revenueModel`은 화면의 핵심 고객, 해결하려는 문제, 시장성, 수익 구조다.
- `value`는 제공 가치다.
- `operations`는 운영 방식이다.
- `executionNote`는 실행 가능성 문장이다. 점수가 아니다.
- `product`, `supply`, `marketing`은 제품, 공급, 마케팅이다. 값이 있을 때만 화면에 나온다.
- `risks`는 모델이 적은 위험이다.
- 지불자, 수익성, 강점, 판단을 바꿀 증거는 빈 값으로 둔다. 부모 행에서 복사하지 않는다.
- 사업 아이디어 칸은 비워 둔다. 제품이나 운영 문장으로 덮지 않는다.

필수 문장 하나가 비거나 빠지면 그 응답은 `failed`다. `callCount`는 1이고 `rawContent`에 원문이 남는다. 같은 답의 재제출은 추가 호출을 하지 않는다. 부모의 `finishedAt`과 부모 문장은 그대로다.

코드는 사업 판단 문장을 만들지 않는다. 주입한 모델 문장을 저장하거나, 칸이 비면 실패로 남긴다.

바꾼 파일:

- `apps/web/features/business-validation-journey/lib/ai-pm-review.ts`
- `apps/web/features/business-validation-journey/lib/ai-pm-review-store.ts`
- `apps/web/features/business-validation-journey/components/ai-pm-review-panel.tsx`
- `apps/web/features/business-validation-journey/lib/__tests__/ai-pm-consulting-stage.test.ts`

데이터 구조 변경은 없다. 테이블 추가, 컬럼 변경, INSERT, UPDATE, DELETE는 없다.

## 2. 품질 기준과 이번 증거

CPO가 지정한 최초 분석 기준은 현재 1차 프롬프트 `quality-2`다. 그 문장은 고객, 문제, 가치, 수익 구조, 운영, 경쟁, 시장을 검토한다. 제품, 공급, 마케팅은 별도 키가 아니다. `AI_PM_FIRST_PROMPT_VERSION`과 `firstReviewSystemPrompt`는 이번 턴에 바꾸지 않았다. 비교 테스트가 그 요청 문장을 고정하고 있고, 실호출로 비교할 키가 없다.

이번 턴에 확인한 것:

- 주입한 단계 응답의 고객 문장 `답을 반영한 고객은 직장인이다`가 자식 행에 저장된다.
- 부모 고객 문장 `직장인`과 부모 `finishedAt`은 유지된다.
- 문제, 가치, 제품, 시장, 수익, 운영 방식, 공급, 마케팅, 경쟁, 실행 문장, 위험이 주입 문장과 같다.
- 요청의 `stagePairs`에 이번 답 `직장인을 고객으로 본다`가 들어간다.
- 고객 칸이 빠진 응답은 `failed`, `sections` null, `callCount` 1, 원문에 `"customer"` 키가 없고, 재제출은 호출을 늘리지 않는다.
- 양조장 주장 `양조장과의 협력 가능성이 높다.`는 `founderClaims`에만 있고 `verifiedFacts`는 빈 배열이다. 코드 분류는 `['claim', 'choice']`다. 시스템 문장은 그 분류를 사실로 승격하지 말라고 적는다.
- 화면 정적 렌더에 제품 `독서 모임`, 공급 `장소 공급은 입력에 없다`, 마케팅 `알림 방법은 아직 확인되지 않았다`가 있다.

이 증거는 저장 계약이다. 모델이 쓴 전략 문장의 품질은 아니다.

## 3. 테스트

실행 시각 2026-11-01 01:25 KST.

```text
pnpm exec vitest run features/business-validation-journey/lib/__tests__/ai-pm-consulting-stage.test.ts --reporter=verbose
```

작업 디렉터리 `apps/web`. 결과: 16 tests passed. 주입한 응답만 사용했다. 라이브 테스트는 실행하지 않았다.

## 4. 실제 요청과 응답

GPT 실호출 NOT RUN.

이 환경의 `GPT_API_KEY`와 `OPENAI_API_KEY`는 없다. `.env`는 없고 `.env.example`만 있다. 응답을 만들지 않았다. Founder 프로젝트에 행을 넣지 않았다. 기존 양조장 행은 읽거나 수정하지 않았다.

실제 Founder 답과 시뮬레이션은 기존 4차 증거에서 이미 구분된다. 이번 턴의 테스트 답은 모두 주입한 시뮬레이션이다.

## 5. 남은 문제

- 1차 분석 `quality-2`는 제품, 공급, 마케팅을 별도 필드로 요구하지 않는다. 실호출 비교는 NOT RUN.
- 단계가 아닌 `productReanalysisSystemPrompt`는 양조장 문장을 유지한다. 제품 후속 라우트는 `stagePairs`가 있으면 단계 프롬프트를 쓴다.
- `founderAnswerKinds`는 여전히 양조장 문장에 `claim`을 붙여 요청의 `answerReading.kinds`로 보낸다. 분류를 늘리거나 제거하지 않았다.
- 4차 라이브 하니스의 저장 판정 사본은 사업 프로필을 요구하지 않는다. 그 사본을 조이면 종료된 마커가 다시 호출될 수 있어 그대로 두었다. 제품 판정은 `judgeStageContract`다.
- `nextQuestions` 항목 설명과 `resolvedIssues` 설명에는 아직 `선정 기준`이 있다. 시스템 문장에서는 뺐다.
- 로그인 후 브라우저 조작 NOT RUN. 확인한 화면은 정적 렌더다.
- 피드백 `7d2d04e5`는 다른 질문에 연결하지 않는다. 실패 행 `3be5715e`는 성공 사슬의 `priorStagePairs`에 없다. 계보 표는 피벗 HOLD라 만들지 않는다.
- 실제 GPT가 사업 전체를 어떻게 다시 쓰는지, 이전 판단을 왜 유지하거나 바꾸는지, 다음 질문이 이미 한 답을 피하는지 NOT RUN.

## 6. 판정 기준

CPO 판정용이다.

- 단계 응답이 사업 구조 문장을 가지고 오면 그 문장을 저장한다. 주입 테스트로 확인.
- 사업 구조 문장이 빠지면 한 번 호출하고 실패로 남긴다. 주입 테스트로 확인.
- 부모 행과 `finishedAt`은 유지된다. 주입 테스트로 확인.
- 이번 답은 요청의 `stagePairs`에 들어간다. 주입 테스트로 확인.
- 주장과 확인된 사실의 원장 구분은 유지된다. 주입 테스트로 확인.
- 실 GPT 전략 품질, 로그인 브라우저, Production은 NOT RUN.
- Sprint 3은 시작하지 않는다.

## 7. 보류

- 피벗 `branch_id` 구현은 Sprint 1~6 판정 전까지 HOLD.
- Production은 CEO 승인 전까지 잠금.
- 질문 수를 코드로 다시 고정하지 않는다.
- 형식 오류를 숨기는 수리 호출은 단계 경로에 없다.
