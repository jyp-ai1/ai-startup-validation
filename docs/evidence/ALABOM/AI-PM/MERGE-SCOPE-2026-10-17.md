# 병합 범위와 재현 경로 — 2026-10-17

전체 판정은 BLOCKED다. GPT·Gemini 원문은 없다. 비교 문장을 쓰지 않았다. 공개 Demo를 비교 경로로 쓰지 않는다. SSO를 끄거나 우회하지 않았다. 제품 코드는 바꾸지 않았다.

## 1. 원문

쿠키 호스트는 `.vercel.com`, `vercel.com`, Preview 호스트 하나다. ChatGPT, OpenAI, Gemini, Google 호스트는 없다. `VERCEL_TOKEN`은 없다. `experiments/business-judgment-poc/prompt.txt`를 웹에 넣지 않았다.

## 2. 비교 페이지가 main에 없는 이유

라우트 파일은 `9aa94edd`에서 들어왔다. 그 커밋은 `origin/cursor/business-refinement-loop-4b88`와 `origin/cursor/external-ai-judgment-design-4b88`에 있고 `origin/main`의 조상이 아니다. Production은 `origin/main` `0b465226`이다. 페이지가 없는 배포라 `/ko/business-validation`은 404다.

## 3. PR #199 범위

`origin/main...HEAD`는 193파일, 삽입 24165줄, 삭제 5줄이다.

| 위치 | 파일 수 |
| --- | --- |
| `docs/evidence` | 77 |
| `apps/web` | 57 |
| `experiments` | 그 밖 |
| `packages` | 0 |

`apps/web`는 추가 52, 수정 5다. 추가의 50개는 `features/business-validation-journey`다. 라우트 페이지 1개가 더 있다. 기존 프로덕션 코드를 고친 파일은 다음 네 개와 테스트 한 개다.

| 파일 | 병합 시 바뀌는 것 |
| --- | --- |
| `decide-next-question-from-review.ts` | 같은 공백을 반복하면 다음 질문 대상을 넘긴다 |
| `features/agents/research/providers/index.ts` | `openai` 키가 OpenRouter 대신 `OpenAICounterReviewProvider`를 쓴다. `execute`는 네트워크를 열지 않고 reject 한다 |
| `product-analytics.ts` | 검증 여정 이벤트 이름 세 개 |
| `vitest.config.ts` | 새 여정 테스트를 포함 |

비교 페이지만 골라 Production에 올릴 수 없다. 페이지는 새 여정 모듈에 의존한다. 브랜치 전체를 병합하면 질문 선택과 research provider 연결도 함께 나간다.

## 4. 병합과 배포의 위험

Production에 비교 URL을 만들려면 PR #199를 `main`에 병합하고 그 SHA가 Production이 되어야 한다. 그 배포는 404만 없애는 변경이 아니다. 질문 넘김과 provider 교체가 같이 나간다. 실패 1·2·5와 실제 원문 비교는 그 배포에서 확인되지 않았다. Preview는 이미 빌드가 끝났고 비로그인은 Vercel SSO다. 보호를 끄면 인증 정책을 약화하므로 하지 않는다.

이번 실행은 병합하지 않았다. Production SHA는 `0b465226` 그대로다.

## 5. 실패 1·2에 입력 경로가 없는 이유

`path1.json`과 `path4.json`은 `apps/`와 `packages/`에서 참조되지 않는다. 실험 폴더의 저장 출력이고, 제품 라우트가 그 파일을 읽어 화면에 넣지 않는다. 여정의 붙여넣기는 사용자가 직접 넣은 문장만 보관한다. 그래서 Production과 Demo 어디에도 그 두 입력의 재현 화면이 없다.

## 6. 실패 5 수정 전 화면

`interpretAnswerSemantics`를 호출하는 제품 화면은 `workspace-ai-pm-loop-panel.tsx` 한 곳이다. 샘플 Demo는 `demoSamplePlayback`이라 그 패널이 읽기 전용이다. 실패 5 문장을 넣을 수 없다.

Production `/workspace?demo=guided&sample=custom&fresh=1`은 로그인 없이 열린다. `문서 없이 AI에게 바로 시작` 뒤 `si-ai-pm-answer`는 편집된다. 그 질문은 `가장 가까운 결제 후보에게 유료로 제안했거나, 실제로 받은 돈이 있습니까?`다. 이 제출은 `interpretAnswerSemantics`를 호출하지 않는다. 실패 5의 `validationTestability` 입력이 아니다.

수정 전 화면이 없으므로 로직을 바꾸지 않았다. 화면 기록은 `docs/evidence/ALABOM/AI-PM/access-path-2026-10-17/prod-custom-demo.png`, `prod-custom-started.png`다.

## 7. CEO가 여는 주소

| 주소 | 결과 |
| --- | --- |
| Production `/ko/business-validation` | 404. 비교 페이지 없음 |
| Preview 같은 경로 | 빌드는 끝났고 비로그인은 SSO |
| Production Clinicflow Demo | 공개. 읽기 전용. 비교 경로가 아님 |
| Production 내 사업 Demo | 공개. 결제 질문만 입력 가능. 비교 경로가 아님 |

## 8. 비용

외부 AI API 0건. 소비자 웹 자동화 0건. 신규 유료 서비스 0건. 호스팅 청구서는 읽지 않았다.
