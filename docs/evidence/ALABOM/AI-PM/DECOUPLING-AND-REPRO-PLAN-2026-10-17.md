# PR 분리와 실패 재현 경로 — 2026-10-17

전체 판정은 BLOCKED다. PR #199를 병합하지 않았다. Production SHA는 `0b465226`이다. 제품 브랜치 HEAD는 `213cdaf6`이다. 외부 AI API 0건, 소비자 웹 자동화 0건, 신규 유료 서비스 0건. 호스팅 청구서는 읽지 않았다. GPT·Gemini 원문을 만들지 않았다. 실패 5 로직을 바꾸지 않았다.

이전 기록 `MERGE-SCOPE-2026-10-17.md`는 PR 전체를 라우트 공개용으로 병합할 수 없다고 적었다. 그 결론은 유지한다. 이번 기록은 그다음 질문만 답한다. 비교 페이지의 실행 import가 질문 넘김과 provider 교체를 실제로 당기는가.

## 1. 현재 diff 분류

`git diff --name-only origin/main...HEAD`는 196파일, 삽입 24234줄, 삭제 5줄이다. 이전 193파일 집계 뒤에 비교 패널과 증거 문서가 더해졌다.

| 묶음 | 파일 수 | 페이지 실행에 필요 |
| --- | ---: | --- |
| `docs/evidence` | 80 | 아니오 |
| 그 밖 문서 | 2 | 아니오 |
| `experiments/` | 57 | 아니오 |
| `features/business-validation-journey` | 50 | 일부만 |
| 라우트 `business-validation/page.tsx` | 1 | 예 |
| `product-analytics.ts` | 1 | 이벤트 이름 3개만 |
| `decide-next-question-from-review.ts`와 그 테스트 | 2 | 아니오 |
| research provider `index.ts`와 `openai-counter-review-provider.ts` | 2 | 아니오 |
| `vitest.config.ts` | 1 | 아니오 |

`packages/` 변경은 0이다.

## 2. 비교 페이지가 실제로 import하는 파일

시작점은 `apps/web/app/[locale]/(public)/business-validation/page.tsx`다. 상대 import와 `@/` import를 따라 실행 그래프를 닫았다. 도달 파일은 25개 변경 파일과, 변경되지 않은 `apps/web/lib/analytics/browser-context.ts` 하나다.

변경 파일 25개:

- 라우트 1개
- 화면 3개: `validation-journey-screen.tsx`, `web-review-panel.tsx`, `plan-refinement-panel.tsx`
- 여정 lib 20개: `analysis-acceptance.ts`, `answer-redelivery.ts`, `citation-reconciliation.ts`, `cross-review-contract.ts`, `execution-contract.ts`, `execution-ledger.ts`, `external-handoff.ts`, `founder-source.ts`, `journey-engine.ts`, `journey-session.ts`, `journey-types.ts`, `judgment-development.ts`, `judgment-transition.ts`, `plan-journey.ts`, `plan-refinement.ts`, `present-execution.ts`, `present-single-action.ts`, `verification-action.ts`, `verification-document.ts`, `web-review-comparison.ts`
- `apps/web/lib/analytics/product-analytics.ts`

이 그래프에 없는 기존 동작 변경:

| 파일 | 하는 일 | 페이지 그래프 |
| --- | --- | --- |
| `decide-next-question-from-review.ts` | 같은 공백 질문 횟수가 한도에 닿으면 그 공백을 닫힌 것처럼 가리고 다음 공백으로 넘긴다 | 없음 |
| `providers/index.ts` | `openai`를 OpenRouter 인스턴스에서 `OpenAICounterReviewProvider`로 바꾼다 | 없음 |
| `openai-counter-review-provider.ts` | 새 제공자. 네트워크를 열지 않고 reject | 없음 |
| `vitest.config.ts` | 여정 테스트 폴더를 기본 실행에 넣는다 | 없음 |

같은 기능 폴더 안에서도 페이지가 열지 않는 파일이 있다. `judgment-loop.ts`, `ledger-disk-store.ts`, `ledger-disk-worker.ts`, `ledger-recovery.ts`, `ledger-storage-contract.ts`, `node-sqlite.d.ts`, 그리고 `__tests__` 전부다.

`judgment-loop.ts`와 테스트 세 개만 provider를 import한다. `founder-source.test.ts`, `judgment-scope.test.ts`, `judgment-transition.test.ts`. `judgment-scope.test.ts`는 `getResearchProvider('openai')`와 `getResearchProvider('gemini')`가 다른 객체이기를 기대한다. `origin/main`의 `providers/index.ts`는 둘 다 같은 OpenRouter 인스턴스다. 그 테스트를 폴더째 포함하면 provider 교체 없이 실패한다. 페이지 화면은 그 테스트를 import하지 않는다.

저장은 `journey-session.ts`의 `sessionStorage` 키 `alabom.validationJourney.v1`이다. 워크스페이스 루프 저장과 다른 키다. DB 쓰기는 이 그래프에 없다.

분석 이벤트 diff는 키 세 개 추가뿐이다.

```text
validationJourneyStarted
validationJourneyAnswered
validationJourneyHandoffKept
```

기존 이벤트 이름과 기록 함수는 이 diff에서 바뀌지 않는다. 화면이 그 키를 읽으므로, 키 없이 페이지만 복사하면 타입 검사가 실패한다.

## 3. 독립 복구 판단

비교 페이지의 실행 코드는 질문 넘김, Demo 읽기 전용, provider 선택과 분리된다. 파일 슬라이스로 라우트를 복구하는 최소안은 가능하다. PR #199 전체 병합은 그 최소안이 아니다.

최소안은 `origin/main`에서 다음만 가져온다.

1. 위 25개 실행 파일. 분석 파일은 이벤트 키 3개만.
2. 그 실행 파일을 검사하고 provider를 import하지 않는 테스트. `web-review-comparison.test.ts`가 여기에 속한다.
3. 그 테스트만 실행하는 설정. 폴더 glob `features/business-validation-journey/**/__tests__/**/*.test.ts`를 그대로 쓰면 provider 결합 테스트가 같이 돈다.

가져오지 않는다.

- `decide-next-question-from-review.ts`와 그 테스트
- `providers/index.ts`, `openai-counter-review-provider.ts`
- `judgment-loop.ts`와 provider를 import하는 테스트 세 개
- 디스크 원장 파일
- `experiments/`, `docs/evidence`

남는 위험:

- 슬라이스도 비교 칸 하나가 아니다. 사업 검증 여정 화면 전체가 공개 라우트로 나간다.
- 슬라이스를 병합하고 Production이 그 SHA가 되기 전에는 `/ko/business-validation`이 404다. 이번 실행은 슬라이스를 만들지 않았고 병합하지 않았다.
- Preview 비로그인은 Vercel SSO다. 슬라이스가 그 보호를 없애지 않는다.
- 슬라이스는 `path1.json`, `path4.json`을 열지 않고 `interpretAnswerSemantics`를 호출하지 않는다. 실패 1·2·5와 실제 원문 비교는 이 복구의 성공이 아니다.

## 4. 실패 1·2 입력과 기대

파일은 있다. 제품 경로는 없다.

| 항목 | 실패 1 | 실패 2 |
| --- | --- | --- |
| 파일 | `experiments/business-judgment-poc/path1.json` | `experiments/business-judgment-poc/path4.json` |
| 모델 | `gpt-oss-20b` | `qwen2.5:3b` |
| id / 시각 | `pllns_ad8b0ebe46b1c7533e046a2c0e703f36`, `2026-10-16T07:32:42Z` | 로컬 Ollama, `2026-10-16T07:32:20Z` |
| 저장 Fact | false | true |
| content | A1만 있다. `A2`, `예상 연매출`, `10억` 없음 | 비중과 유지 불가를 한 Claim으로 합침 |

기대는 `docs/evidence/ALABOM/AI-PM/BUSINESS-JUDGMENT-POC.txt`와 `FAILURE-125-OFFLINE-2026-10-16.md`다. 출력에 A2와 S3 예상 연매출이 있고, 원장·결제 증거가 없으면 Fact는 false다. 실패 1은 누락에서 기대와 다르다. 실패 2는 Fact true에서 기대와 다르다.

`features/business-validation-journey`는 두 파일명을 참조하지 않는다. `recordExternalAnalysis`는 모델 JSON의 Fact를 읽지 않는다. `verifiedFact: false`를 상수로 넣는다. 그 함수가 false를 남긴 것은 path4의 Fact true를 거절한 기록이 아니다.

입력을 받은 사실과 기대를 통과한 사실은 다음처럼 가른다.

- 입력 수신: JSON이 파싱되고 `content` 문자열이 있다. 두 파일 모두 이 단계는 파일 안에 이미 있다.
- 기대 통과: content가 A2와 `10억`을 포함하고, 원장 없이 Fact가 false다. 두 파일 모두 이 단계는 실패다.

최소 재현 경로는 새 화면이 아니다. 로컬 테스트가 두 JSON을 읽고, 수신 단언과 기대 단언을 따로 남긴다. 수신 단언은 id, 모델, content 존재다. 기대 단언은 실패 1의 누락 문자열과 실패 2의 `output_parse.object.Fact === true`다. `recordExternalAnalysis`의 `verifiedFact: false`는 기대 통과로 세지 않는다. 모델은 다시 호출하지 않는다. 이 테스트는 이번 실행에서 추가하지 않았다. 설계만 기록했다.

## 5. 실패 5 호출과 편집 화면

`interpretAnswerSemantics`의 제품 화면 호출은 `workspace-ai-pm-loop-panel.tsx`의 `submitAnswer`다. 1612행은 `readOnly`이면 그 함수에 닿기 전에 return한다. `workspace-ai-pm-main.tsx` 903–907행은 `demoSamplePlayback`이면 `readOnly`를 true로 넘긴다. 공개 Demo `sample=clinicflow`는 그 경로다.

`sample=custom`은 playback이 아니다. `demoMyBusinessPreview`가 켜지고, 판단·리뷰·보충 보기에서는 `shouldBlockDemoMyBusinessJudgment`가 다시 읽기 전용으로 막는다. 이전 브라우저 실행에서 문서 없는 custom은 결제 후보 질문을 보여 줬고 `validationTestability`에 들어가지 않았다. 이번 실행은 그 문장을 넣지 않았다.

분기: 458–461행은 고객 정정이면 `factKey`를 `customer`로 두고 return하지 않는다. 550행 `askedGap === 'validationTestability'`는 462행에서 시작한 `else if`라 458행이 맞은 뒤에는 실행되지 않는다. 738–749행이 `quality: 'VALID'`, `mergeable: true`로 반환한다. 기대는 `PARTIAL`, `mergeable: false`다.

수정 전 브라우저 재현은 없다. 편집 가능한 비 Demo 워크스페이스는 로그인 프로젝트가 필요하다. 이 환경의 쿠키 호스트는 `.vercel.com`, `vercel.com`, Preview 호스트 하나다. 로그인 워크스페이스 세션은 없다. 공개 Demo를 재현으로 세지 않는다. 로직은 바꾸지 않았다.

## 6. 원문

Chrome 쿠키 6개. 호스트는 `.vercel.com`, `vercel.com`, `ai-startup-validation-git-cursor-ai-pm-acd5a4-jyp-ai1s-projects.vercel.app`이다. ChatGPT, OpenAI, Gemini, Google 계정 호스트는 없다. `experiments/business-judgment-poc/prompt.txt`를 웹에 넣지 않았다. 원문 파일은 새로 쓰지 않았다. 원문만 BLOCKED다. 이 조사는 원문을 기다리지 않고 진행했다.

## 7. 완료 조건

| 조건 | 상태 |
| --- | --- |
| PR #199 위험과 분리 가능성 | 조사 완료. 전체 병합은 위험. 실행 그래프 25파일 슬라이스는 가능. 슬라이스는 만들지 않음 |
| 실패 1·2 입력 경로와 기대 | 파일과 기대는 확인. 제품 경로 없음. 기대는 미통과. 재현 테스트는 미구현 |
| 실패 5 수정 전 브라우저 재현 | 없음. 로직 미수정 |
| GPT·Gemini 원문 | BLOCKED |
| 실제 원문 비교와 저장·복원 | 미검증 |
| CEO 브라우저의 비교 여정 | BLOCKED. Production 404, Preview SSO |
| Production SHA와 검증 코드 일치 | 불일치. Production `0b465226`, 브랜치 `213cdaf6` |
