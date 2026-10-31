# Sprint Q1 Browser Gate

Q9·Q10은 **BLOCKED**다. 양조장 입력의 quality-9 재호출은 Q1–Q8을 다시 통과했다. 체험만 있는 입력과 공급자 지원만 있는 입력은 질문·선택지·파서가 실패다. 기본값은 `quality-2`다. 1차 완료가 아니다. `sprint-q1-quality8-recorded.json`과 `sprint-q1-quality9-recorded.json`은 바꾸지 않았다.

세 호출의 원문은 `sprint-q1-quality9-inputs-recorded.json`이다. 실행 SHA `b881af28d97024c09f480090a047c6e71697f47f`. 시작 2026-10-29 17:29:37 KST, 종료 17:29:53 KST. 모델 `gpt-4o-mini-2024-07-18`, temperature 0.2, max tokens 2400, JSON. 비교 기록의 `productFollowUpInvoked`는 false다. 이 값만으로 브라우저 후속 호출이 없었다고 보지 않는다.

## 권한

| 항목 | 판정 | 근거 |
|---|---|---|
| OpenAI, Preview 빌드 | **PASS** | 같은 빌드에서 후보 호출 3건이 `RECORDED`다. 로컬 `GPT_API_KEY`는 없다 |
| OpenAI, 이 세션 | **NOT RUN** | 로컬 키가 없어 이 세션에서 직접 호출하지 않았다 |
| Vercel CLI | **BLOCKED** | `npx vercel whoami`는 `Logged out`이다. `VERCEL_TOKEN`은 없다 |
| Preview 로그인 | **BLOCKED** | `GET https://ai-startup-validation-fvqqfcdr8-jyp-ai1s-projects.vercel.app/workspace` 는 `Accept: application/json`에서 HTTP 401, `Protected by Vercel Authentication`이다. 확인 시각 2026-10-29 17:28 KST |
| Supabase 비교 저장 | **PASS** | 기존 객체 읽기 HTTP 200, 이번 세 호출 객체 쓰기 후 다시 읽음 |
| 로그인 사용자의 검토 저장 | **NOT RUN** | Preview 계정으로 검토 행을 만들지 않았다 |

인증 우회 헤더와 Vercel MCP는 쓰지 않았다. 키 값은 적지 않았다.

## 양조장 재호출

`founderFacts`는 입력의 두 문장이다. `inferences`는 `추론: 입력은 체험과 마케팅 지원을 함께 구상한다고 말한다. 어느 쪽을 먼저 검증할지는 입력에 없다.` 이다. 사용자 문장이 그 한 줄을 지정했다. `strengths`는 `["미확인"]`이다. `payer`는 `미확인`이다. `revenueModel`은 `가설: 체험 참가비 — 가설: 수수료 — 가설: 수익 공유 — 가설: 마케팅 서비스 수수료`다. 질문은 `무엇을 먼저 검증할 것인가?`이고 선택지는 체험, 마케팅 지원, 결합, 미결정, 기타다. 제품 파서가 이 원문을 분석으로 읽었다.

| ID | 판정 |
|---|---|
| Q1 | **PASS** |
| Q2 | **PASS** |
| Q3 | **PASS** |
| Q4 | **PASS** |
| Q5 | **PASS** |
| Q6 | **PASS** |
| Q7 | **PASS** |
| Q8 | **PASS**. 파서가 읽었다. Preview 계정 저장은 아니다 |
| Q9 | **BLOCKED** |
| Q10 | **BLOCKED** |

## 다른 입력

체험 입력은 `외국인 관광객에게 막걸리 만들기체험만 안내한다.` 공급자 입력은 `지역 공장에 온라인 마케팅 페이지 제작만 대행한다.` 둘 다 양조장 다섯 선택지 문구는 없다. `founderFacts`는 각 입력 문장이다. `inferences`는 `["미확인"]`이다. `payer`는 `미확인`이다.

체험의 `revenueModel`은 `가설: 체험 참가비`만 있다. 공급자의 `revenueModel`은 `가설: 마케팅 서비스 수수료`만 있다. 나머지 수익 항목의 `가설:`이 없다. 둘 다 `choices`가 배열이 아니라서 제품 파서가 분석을 만들지 못한다.

체험 질문은 `이용자 경험과 공급자 지원이 어떻게 갈라지는지 검증할 수 있을까요?`다. 입력에는 공급자 지원이 없다. 공급자 질문과 `choices`는 `고객, 지불자, 운영이 갈라지는 검증`이다. 공장 페이지 대행의 갈림길을 나누지 않는다.

| 입력 | 사실·추론 분리 | 질문·선택지 | 수익 항목 | 파서 |
|---|---|---|---|---|
| 체험만 | **PASS**. 입력 문장을 추론으로 복사하지 않음 | **FAIL** | **FAIL** | **FAIL** |
| 공급자 지원만 | **PASS**. 입력 문장을 추론으로 복사하지 않음 | **FAIL** | **FAIL** | **FAIL** |

이 두 출력은 계약 테스트가 아니다. 모델이 반환한 원문이다. 양조장에서 지정된 추론 한 줄을 되풀이한 것만으로 다른 사업의 추론 품질이 통과한 것은 아니다.

## Q9·Q10

로그인, 분석 생성, 답 저장, 새로고침, 로그아웃, 재인증, 브라우저 요청, 서버 호출 기록은 실행하지 않았다. Preview에 로그인할 수 있는 Vercel 계정이 없다. Production 잠금은 유지했다.

## 테스트

`pnpm exec vitest run features/business-validation-journey/lib/__tests__/ai-pm-quality-compare.test.ts` 는 12개 통과다. 그 테스트는 모델 호출이 아니다. 이번 턴에 `next build`는 다시 실행하지 않았다. 세 호출을 저장한 Preview 빌드의 Vercel 상태는 기록 시각에 `pending`이었다.
