# quality-8-cpo-draft 1회 호출과 브라우저 게이트

Q1–Q8은 이 원문과 제품 파서·로컬 저장 재조회에서 다시 통과했다. Q9·Q10은 **NOT RUN**이다. 제품 흐름 통과가 아니다. 기본값은 `quality-2`다. 1차 완료가 아니다. `quality-7` 원문과 판정표는 바꾸지 않았다.

## 모델 호출

실행 SHA `be06edd50fa38226aa137c22cb5219108266e44b`. Preview 빌드 1회. 시작 2026-10-29 17:10:11 KST, 종료 17:10:21 KST. 모델 `gpt-4o-mini-2024-07-18`, temperature 0.2, max tokens 2400, JSON. 비교 기록의 `productFollowUpInvoked`는 false다. 이 플래그만으로 브라우저 후속 호출이 없었다고 보지 않는다. 원문은 `sprint-q1-quality8-recorded.json`이다.

`quality-2`는 다시 호출하지 않았다.

`founderFacts`는 입력의 두 문장이다. `관광 및 주류 산업 경험`과 `마케팅 및 운영 관리 능력`은 없다.

`strengths`는 `["미확인"]`이다. `전통주에 대한 관심 증가`는 없다.

`inferences`는 두 항목 모두 `추론:`으로 시작하고, 각 항목이 입력 문장을 그대로 포함한다. 입력 문장을 추론 목록에 다시 적은 것이라, 사실과 다른 추론을 새로 쓰지는 않았다.

`revenueModel`은 문자열이다. 네 항목이 각각 `가설:`로 시작한다. `payer`는 `미확인`이다. 질문은 `무엇을 먼저 검증할 것인가?`이고 선택지는 체험, 마케팅 지원, 결합, 미결정, 기타다.

제품 파서 `parseSections`가 이 원문을 분석으로 읽었다. 로컬 SQLite에 저장한 뒤 `listReviews`로 다시 읽었고 수익 문자열은 같았다. 이 저장은 Preview 계정의 저장이 아니다.

## 단위 테스트와 모델 응답

단위 테스트는 모델 호출이 아니다. 양조장 입력의 사용자 문장에 입력 문장만 `founderFacts`로 두고, `strengths`는 `["미확인"]`, 추론은 `추론:`으로 시작하게 했다. 체험만 있는 입력과 공급자 지원만 있는 입력에는 양조장 다섯 선택지를 붙이지 않는다. 만든 경력·관심 증가·표시 없는 추론은 채점 함수가 거절한다. 문자열 수익은 파서와 로컬 저장 재조회를 통과한다. 객체형 `revenueModel`, 필수 키 누락, 잘못된 JSON은 분석으로 저장하지 않는다. 이 테스트 11개와 기존 검토 테스트 18개가 통과했다.

실제 모델 응답은 위 1회다. 체험만 있는 입력과 공급자 지원만 있는 입력의 모델 출력은 **NOT RUN**이다.

## 게이트

| ID | 판정 |
|---|---|
| Q1 | **PASS**. 요약에 양조장 체험과 온라인 마케팅 지원이 있다 |
| Q2 | **PASS**. 네 수익 항목이 각각 `가설:`로 시작한다 |
| Q3 | **PASS**. `payer`는 `미확인` |
| Q4 | **PASS**. 강점과 판단이 `미확인`이다 |
| Q5 | **PASS**. 무엇을 먼저 검증할지 묻고 선택지와 같다 |
| Q6 | **PASS**. 다섯 선택지 |
| Q7 | **PASS**. 질문은 하나고 이유가 있다 |
| Q8 | **PASS**. 파서가 읽었고 로컬 저장 후 같은 수익 문자열을 다시 읽었다 |
| Q9 | **NOT RUN** |
| Q10 | **NOT RUN** |

## Q9·Q10 차단

`d5209232`, `25056552`, `be06edd5`의 Vercel 상태는 failure였다. 화면 컴포넌트가 `ai-pm-review.ts`를 값으로 가져오면서 `node:crypto`가 클라이언트 묶음에 들어갔다. 오류 문장은 `ai-pm-review-failure-copy.ts`로 분리했다. 그 수정 SHA `5fe7a990378a9019799e3bea79ff8bbeca124ab4`의 Preview는 빌드가 끝났다.

주소는 `https://ai-startup-validation-fvqqfcdr8-jyp-ai1s-projects.vercel.app/workspace`다. `Accept: application/json`인 `GET /workspace`는 HTTP 401이다. 메시지는 `Protected by Vercel Authentication`이고 `vercel_auth_enabled`는 true다. 이전 성공 배포 `https://ai-startup-validation-cblzp49tt-jyp-ai1s-projects.vercel.app/workspace`도 같은 401이다. 인증 우회 헤더와 Vercel MCP는 쓰지 않았다. 로그인, 분석, 답 저장, 새로고침, 로그아웃, 재인증은 실행하지 않았다.

실행하지 못한 항목은 분석 생성, 질문 확인, 답 저장, 새로고침, 로그아웃 후 재인증, 복원, 답 저장 뒤의 브라우저 요청과 서버 호출 기록이다. 필요한 조건은 이 Preview에 로그인할 수 있는 Vercel 계정이다. Production 잠금은 유지했다.
