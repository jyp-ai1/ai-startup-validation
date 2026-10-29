# quality-9-cpo-draft 1회 호출

Q1–Q8은 이 원문과 제품 파서·로컬 저장 재조회에서 다시 통과했다. `inferences`는 입력 문장을 다시 적지 않았다. Q9·Q10은 **NOT RUN**이다. 제품 흐름 통과가 아니다. 기본값은 `quality-2`다. 1차 완료가 아니다. `quality-8` 원문과 판정표는 바꾸지 않았다.

## 모델 호출

실행 SHA `0a49cc3feb13dac4b8a189aec8a5c12dd2b218ea`. Preview 빌드 1회. 시작 2026-10-29 17:21:59 KST, 종료 17:22:05 KST. 모델 `gpt-4o-mini-2024-07-18`, temperature 0.2, max tokens 2400, JSON. 비교 기록의 `productFollowUpInvoked`는 false다. 이 플래그만으로 브라우저 후속 호출이 없었다고 보지 않는다. 원문은 `sprint-q1-quality9-recorded.json`이다.

`quality-2`는 다시 호출하지 않았다.

사용자 문장이 추론 한 줄을 지정했고, 모델이 그 줄을 반환했다.

`추론: 입력은 체험과 마케팅 지원을 함께 구상한다고 말한다. 어느 쪽을 먼저 검증할지는 입력에 없다.`

`founderFacts`는 입력의 두 문장이다. 추론 목록은 그 문장을 포함하지 않는다.

`strengths`는 `["미확인"]`이다.

`revenueModel`은 문자열이다. `가설: 체험 참가비 — 가설: 수수료 — 가설: 수익 공유 — 가설: 마케팅 서비스 수수료`. 네 항목이 각각 `가설:`로 시작한다. `입력에 없다`라는 꼬리 문장은 빠졌다. `payer`는 `미확인`이다. 질문은 `무엇을 먼저 검증할 것인가?`이고 선택지는 체험, 마케팅 지원, 결합, 미결정, 기타다.

제품 파서 `parseSections`가 이 원문을 분석으로 읽었다. 로컬 SQLite에 저장한 뒤 `listReviews`로 다시 읽었고 수익 문자열은 같았다. 이 저장은 Preview 계정의 저장이 아니다.

## 단위 테스트와 모델 응답

단위 테스트는 모델 호출이 아니다. 입력 문장을 추론으로 다시 넣은 출력은 거절하고, 지정한 해석 한 줄은 통과한다. 체험만 있는 입력과 공급자 지원만 있는 입력의 추론은 `미확인`이고 양조장 다섯 선택지를 붙이지 않는다. 이 계약 테스트는 통과했다.

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

`vercel whoami`는 `Logged out`이다. 이 실행 환경에 주입된 비밀 이름은 Supabase 항목뿐이고 Vercel 계정은 없다. 인증 우회 헤더와 Vercel MCP는 쓰지 않았다.

`GET https://ai-startup-validation-fvqqfcdr8-jyp-ai1s-projects.vercel.app/workspace` 는 `Accept: application/json`에서 HTTP 401이다. 메시지는 `Protected by Vercel Authentication`이고 `vercel_auth_enabled`는 true다. 시각은 2026-10-29 17:21 KST다.

실행하지 못한 항목은 로그인, 분석 생성, 답 저장, 새로고침, 로그아웃 후 재인증, 복원, 답 저장 뒤의 브라우저 요청과 서버 호출 기록이다. 필요한 조건은 이 Preview에 로그인할 수 있는 Vercel 계정이다. Production 잠금은 유지했다.
