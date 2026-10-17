# CEO 수동 검증 화면 — 2026-10-17

전체 판정은 BLOCKED다. 이 문서는 수동 입력 화면의 구현과 로컬 검증만 적는다. 실제 GPT 웹 조회, Gemini 웹 조회, 피드백 후 재조회, Production 배포는 하지 않았다.

| 관문 | 상태 | 근거 |
| --- | --- | --- |
| 화면 구현 | 로컬에서 입력·복사·라운드 구분 확인 | `/ko/validation-bench`. 헤드리스와 화면 브라우저 검사 통과 |
| 데이터 보존 | 이 브라우저 탭의 sessionStorage | 키 `alabom.validationBench.v1`. 새로고침 후 남음. 다른 브라우저 컨텍스트에는 없음. 서버 저장 아님 |
| AI 원문 왕복 | BLOCKED | GPT 웹과 Gemini 웹을 호출하지 않음. 원문 파일을 만들지 않음 |
| 피드백 재실행 | 화면은 다음 입력에 피드백을 넣음. 재조회는 미실행 | 라운드 2의 GPT·Gemini는 빈 칸 |
| Production | NOT RUN | Production SHA `0b465226`. `https://ai-startup-validation-tau.vercel.app/ko/validation-bench` 는 404 |

## 경로

`/workspace/validation-lab`은 쓰지 않았다. `apps/web/app/[locale]/(shell)/workspace/layout.tsx`가 `requireAuthUser`를 호출한다. 인증을 우회하지 않기 위해 공개 경로 `apps/web/app/[locale]/(public)/validation-bench/page.tsx`에 두었다. 기존 사업 이해 화면의 세션 키 `alabom.validationJourney.v1`와 분리했다.

## 저장

`saveBench`가 `sessionStorage.setItem`에 성공하면 화면에 “이 브라우저 탭의 세션에 기록했다”를 보여 준다. 실패하면 “세션 기록에 실패했다. 저장 완료가 아니다.”를 보여 준다. 영구 저장 완료라는 문구는 쓰지 않는다. `permanent`와 `liveModelCall`은 false다. 사업계획 원문은 URL, 분석 이벤트 본문에 넣지 않는다.

규칙 취합은 두 원문이 비어 있지 않을 때만 `compareWebReviews`를 호출한다. 그 규칙은 고정된 S1–S6, A1–A2 문구만 본다. 수동 종합은 별도 칸이고 규칙 결과로 채우지 않는다.

## 로컬에서 확인한 동작

브라우저 검사는 시험용 표식 문장을 붙였다. 그 문장은 GPT 웹이나 Gemini 웹의 응답이 아니다.

- 빈 화면은 미입력이고 규칙 취합은 미실행이며, 검증 완료가 아니다.
- 4,000자가 넘는 사업계획을 칸이 유지한다.
- 사업계획, GPT, Gemini, 수동 종합, 피드백, 다음 입력, Markdown, JSON 복사가 클립보드와 일치한다.
- 원문이나 피드백이 없으면 다음 라운드를 열지 않는다.
- 라운드 2를 열면 라운드 1 원문과 피드백은 보존되고, 라운드 2 원문은 비어 있다.
- 새로고침 후 같은 탭 세션에서 다시 읽는다.
- 다른 브라우저 컨텍스트에는 그 원문이 없다.
- 분석 요청 본문에 사업계획과 원문 표식이 없다.

## 실행한 검사

- `features/manual-validation-bench/lib/__tests__/validation-bench.test.ts` 8개 통과.
- 비교 슬라이스 관련 테스트 7파일 46개 통과. 게이트 설정 2개 통과. 게이트 통과는 원문 파일이 없다는 뜻이다.
- `next build` 종료 코드 0. 라우트 `/[locale]/validation-bench`가 생성됐다.
- 설정에 포함된 전체 vitest는 이 변경과 무관한 기존 실패가 있다. 30개 실패, 989개 통과. 그중 `validationTestability` 실패는 기존 해석 규칙이며 이 화면이 그 파일을 수정하지 않았다.

## 하지 않은 것

외부 AI API 0건. 웹 자동화 0건. 새 테이블과 마이그레이션 0건. PR #199와 PR #200 병합 0건. Production 배포 0건.
