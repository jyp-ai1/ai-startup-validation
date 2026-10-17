# 비교 라우트 슬라이스와 실패 재현 — 2026-10-17

전체 판정은 BLOCKED다. PR #199는 병합하지 않았다. 이 슬라이스도 병합하지 않았고 Production에 배포하지 않았다. Production SHA는 `0b465226`이다. 슬라이스 기준은 `origin/main`의 그 SHA다. 외부 AI API 0건, 소비자 웹 자동화 0건, 신규 유료 서비스 0건. 호스팅 청구서는 읽지 않았다. GPT·Gemini 원문을 만들지 않았다. 실패 5 로직을 바꾸지 않았다.

## 1. 화면 범위

공개 라우트 `/[locale]/business-validation`은 비교 전용 화면이 아니다. 페이지 제목은 `내 사업 이해하기`이고, 본문은 `ValidationJourneyScreen`이다. 그 화면은 사업 입력, 질문, 계획 재구성, 그리고 `WebReviewPanel`을 함께 렌더한다. 비교 칸은 여정 화면의 한 구간이다.

## 2. 변경 목록

첫 커밋 `4ba47a0b`. `origin/main` 대비 28파일. 실행 그래프의 변경 파일은 25개다. `apps/web/lib/analytics/browser-context.ts`는 그래프에 있으나 이 브랜치에서 수정하지 않았다.

실행 파일 25개:

- `apps/web/app/[locale]/(public)/business-validation/page.tsx`
- `apps/web/features/business-validation-journey/components/plan-refinement-panel.tsx`
- `apps/web/features/business-validation-journey/components/validation-journey-screen.tsx`
- `apps/web/features/business-validation-journey/components/web-review-panel.tsx`
- `apps/web/features/business-validation-journey/lib/analysis-acceptance.ts`
- `apps/web/features/business-validation-journey/lib/answer-redelivery.ts`
- `apps/web/features/business-validation-journey/lib/citation-reconciliation.ts`
- `apps/web/features/business-validation-journey/lib/cross-review-contract.ts`
- `apps/web/features/business-validation-journey/lib/execution-contract.ts`
- `apps/web/features/business-validation-journey/lib/execution-ledger.ts`
- `apps/web/features/business-validation-journey/lib/external-handoff.ts`
- `apps/web/features/business-validation-journey/lib/founder-source.ts`
- `apps/web/features/business-validation-journey/lib/journey-engine.ts`
- `apps/web/features/business-validation-journey/lib/journey-session.ts`
- `apps/web/features/business-validation-journey/lib/journey-types.ts`
- `apps/web/features/business-validation-journey/lib/judgment-development.ts`
- `apps/web/features/business-validation-journey/lib/judgment-transition.ts`
- `apps/web/features/business-validation-journey/lib/plan-journey.ts`
- `apps/web/features/business-validation-journey/lib/plan-refinement.ts`
- `apps/web/features/business-validation-journey/lib/present-execution.ts`
- `apps/web/features/business-validation-journey/lib/present-single-action.ts`
- `apps/web/features/business-validation-journey/lib/verification-action.ts`
- `apps/web/features/business-validation-journey/lib/verification-document.ts`
- `apps/web/features/business-validation-journey/lib/web-review-comparison.ts`
- `apps/web/lib/analytics/product-analytics.ts` — 이벤트 키 3개만 추가

테스트와 실행 설정 3개:

- `apps/web/features/business-validation-journey/lib/__tests__/web-review-comparison.test.ts`
- `apps/web/features/business-validation-journey/lib/__tests__/slice-regression-boundary.test.ts`
- `apps/web/vitest.config.ts` — 위 두 테스트 파일만 포함. 여정 폴더 glob은 넣지 않았다.

페이지 import를 다시 닫았다. 도달 파일 26개 중 변경은 25개, 미변경은 `browser-context.ts`다. 빠진 로컬 import는 0이다. 다음 파일은 diff에 없다.

- `decide-next-question-from-review.ts`
- `providers/index.ts`
- `openai-counter-review-provider.ts`
- `judgment-loop.ts`
- 디스크 원장 파일

`providers/index.ts`는 이 브랜치에서 `openai`와 `gemini`가 같은 OpenRouter 인스턴스다. 그 인스턴스의 `id`는 `gemini`다. 슬라이스는 이 연결을 바꾸지 않는다.

## 3. 빌드와 회귀

로컬 `pnpm exec next build`는 종료 코드 0이다. 라우트 목록에 `/[locale]/business-validation`이 있다. 이 빌드는 Production 배포가 아니다. Production `/ko/business-validation`은 같은 시각에 HTTP 404, `x-matched-path: /_not-found`다.

회귀 테스트 34개, 6파일, 종료 코드 0.

| 파일 | 결과 |
| --- | --- |
| `web-review-comparison.test.ts` | 6 PASS |
| `slice-regression-boundary.test.ts` | 4 PASS |
| `day7-p0-fixes.test.ts` | 6 PASS. `decideNextQuestionFromReview` 호출 |
| `recovery2-p0-2-question-loop.test.ts` | 5 PASS. `decideNextQuestionFromReview` 호출 |
| `p0-3-demo-hydration.test.ts` | 8 PASS |
| `demo-gate1-isolation.test.ts` | 5 PASS |

경계 테스트가 확인한 현재 동작: `getResearchProvider('openai')`와 `getResearchProvider('gemini')`는 같은 객체이고 id는 `gemini`다. `decideNextQuestionFromReview` 소스에 `maskGapClosed`와 `yieldedFrom`이 없다. 워크스페이스 레이아웃은 `requireAuthUser`를 호출한다.

## 4. 실패 1·2 재현

테스트 `stored-model-output-repro.test.ts`. 입력은 `experiments/business-judgment-poc/path1.json`, `path4.json`, `prompt.txt`다. 기본 여정 회귀와 같은 파일에 넣었으므로 이후 `vitest run`은 이 파일도 고른다. 이번 실행은 그 파일만 돌렸고 종료 코드는 1이다. 9개 중 5 PASS, 4 FAIL. 테스트가 있다는 것은 실패가 해결됐다는 뜻이 아니다.

| 검사 | 결과 | 실제 |
| --- | --- | --- |
| path1 수신 | PASS | name `path1-anonymous`, model `gpt-oss-20b`, schema_ok, content 존재 |
| path1 출력에 `A2` | FAIL | content에 없음 |
| path1 출력에 `예상 연매출` 또는 `10억` | FAIL | content에 없음 |
| path1 Fact | PASS | 입력 구간에 원장·결제·입금·세금계산서 없음. Fact false |
| path4 수신 | PASS | name `path4-local`, model `qwen2.5:3b`, schema_ok, content 존재 |
| path4 출력에 `유지할 수 없다` | PASS | A2 문장의 그 구절은 있다 |
| path4 출력에 `예상 연매출` 또는 `10억` | FAIL | content에 없음 |
| path4 Fact | FAIL | 입력 구간에 원장 증거 없음. 저장된 Fact는 true |
| `recordExternalAnalysis` 상수 | PASS | 붙여넣은 문장에 `"Fact": true`가 있어도 노트 `verifiedFact`는 false |

마지막 PASS는 모델 Fact 검증 통과가 아니다. 함수는 Fact 필드를 읽지 않고 `verifiedFact: false`를 넣는다. path4의 Fact true는 그 상수와 따로 실패로 남는다.

## 5. 실패 5

편집 가능한 비 Demo 경로는 로그인된 소유 프로젝트다. `apps/web/app/[locale]/(shell)/workspace/layout.tsx`는 demo 쿠키가 없으면 `requireAuthUser('/workspace')`를 호출한다. 사용자가 없으면 `/auth/login?next=/workspace`로 보낸다. `workspace/page.tsx`의 `demoMode="default"`는 그 인증 분기 안에만 있다. 인증 없는 demo 쿼리는 `demo-readonly` 또는 `demo-guided`다.

`WorkspaceAiPmLoopPanel`을 그리는 제품 화면은 `workspace-ai-pm-main.tsx` 하나다. `submitAnswer`는 `readOnly`이면 `interpretAnswerSemantics` 전에 반환한다. `demoSamplePlayback`이면 그 패널의 `readOnly`가 true다.

Production `GET /ko/workspace` 응답 본문에 `NEXT_REDIRECT;replace;/auth/login?next=%2Fworkspace;307`이 있다. 이 실행 환경의 쿠키 호스트는 `.vercel.com`, `vercel.com`, Preview 호스트 하나다. 로그인 세션이 없어 정정 문장을 제출하지 못했다. 반환값을 만들지 않았다. 로직을 바꾸지 않았다. 판정은 BLOCKED다.

## 6. 원문과 Production

ChatGPT, OpenAI, Gemini, Google 계정 쿠키는 없다. `prompt.txt`를 웹에 넣지 않았다. 원문 판정은 BLOCKED다. 비교 품질은 판정하지 않았다.

슬라이스 병합과 배포는 하지 않았다. Production SHA와 라우트 응답, 저장·복원, CEO 브라우저 여정은 NOT RUN이다. Preview SSO를 끄지 않았다.
