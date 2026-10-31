# Sprint Q1 — 원문 독립 호출과 브라우저 관문

1차 검증 완료가 아니다. 기본값은 `quality-2`다. Production 잠금은 유지했다. quality-8부터 quality-12 증거 원문은 바꾸지 않았다. 2차 리뷰 경로는 호출하지 않았다.

## 인증

| 항목 | 판정 | 근거 |
|---|---|---|
| Vercel CLI | **BLOCKED** | 2026-10-29 17:57 KST. `npx vercel whoami`는 `Logged out`이다. 이 환경에 `VERCEL_TOKEN`과 Vercel auth 파일이 없다 |
| Preview 로그인 | **BLOCKED** | `GET https://ai-startup-validation-fvqqfcdr8-jyp-ai1s-projects.vercel.app/workspace` 는 `Accept: application/json`에서 HTTP 401, `Protected by Vercel Authentication`이다. 같은 시각 |
| OpenAI, Preview 빌드 | **PASS** | 아래 독립 호출 3건이 `RECORDED`다. 로컬 `GPT_API_KEY`는 없다 |
| Q9 | **BLOCKED** | 로그인부터 재인증까지 실행하지 않았다 |
| Q10 | **BLOCKED** | 브라우저 요청과 서버 호출 로그를 보지 못했다 |

인증 우회는 하지 않았다. API 호출이 되었다는 사실로 Preview 로그인을 통과로 보지 않는다. Q9·Q10을 실행하려면 Preview 배포에 로그인할 수 있는 Vercel 계정이 필요하다.

## Q9

| 단계 | 판정 |
|---|---|
| 로그인 | **NOT RUN** |
| 양조장 입력과 1차 분석 | **NOT RUN** |
| 답변 저장 | **NOT RUN** |
| 새로고침 후 복원 | **NOT RUN** |
| 로그아웃 후 재로그인 | **NOT RUN** |
| 같은 사용자·워크스페이스 복원 | **NOT RUN** |
| 다음 검증 방향 | **NOT RUN** |
| Q9 전체 | **BLOCKED** |

## Q10

| 확인 | 판정 |
|---|---|
| 브라우저 네트워크 | **NOT RUN** |
| 서버 모델 호출 로그 | **NOT RUN** |
| 저장 요청과 모델 호출의 순서 | **NOT RUN** |
| 새로고침·재로그인 때의 추가 호출 | **NOT RUN** |
| Q10 전체 | **BLOCKED** |

비교 기록의 `productFollowUpInvoked`는 false다. 그 플래그만으로 Q10을 통과로 보지 않는다.

## 독립 모델 호출

제품 프롬프트 `quality-2`에 사업 원문만 넣었다. 질문, 선택지, 수익 문자열, 추론 문장은 사용자 메시지에 없다. 프롬프트 본문은 바꾸지 않았다.

원문은 `sprint-q1-quality2-independent-recorded.json`이다. 실행 SHA `c0bb51e02399ec71f7d5923dfce9586b7a2fd547`. 시작 2026-10-29 17:59:14 KST, 종료 17:59:40 KST. 모델 `gpt-4o-mini-2024-07-18`, temperature 0.2, max tokens 2400, JSON, finish `stop`. 프롬프트 버전은 `quality-2:brewery`, `quality-2:experience`, `quality-2:supplier`다.

이 호출은 quality-12 복제 검증과 따로 집계한다. quality-12 원문은 그대로다.

| 입력 | 파서 | 질문 | 선택지 대응 | 없는 축 | 사실 | 지불자 | 수익 구분 | 추론 |
|---|---|---|---|---|---|---|---|---|
| 양조장 | **PASS**. `alternatives`, `differentiation`이 없어 그 두 칸만 `미확인` | **FAIL**. `양조장과의 협력 관계를 어떻게 구축할 것인가?` 체험과 마케팅 지원 중 무엇을 먼저 볼지는 묻지 않는다 | **FAIL**. 선택지는 운영 방식이고 질문과 같은 결정이 아니다 | **PASS** | **FAIL**. `founderFacts`에 산업 경험과 네트워크. `strengths`에 관심 증가 | **FAIL**. 관광객을 지불자로 적음 | **FAIL**. 문장 끝 `(가설)` 하나. 항목별 `가설:` 없음. 판매 수익을 추가 | **FAIL**. `추론:` 표시 없음 |
| 체험만 | **PASS**. 같은 두 칸을 `미확인`으로 채움. 원문 선택지에 미결정·기타가 없어 파서가 `아직 핵심을 정하지 못했다`와 `기타 / 직접 입력`을 붙였다 | **FAIL**. 막걸리 체험이 아닌 다른 전통 문화 체험을 묻는다 | **FAIL**. 선택지도 추가 체험·언어·시음에 대한 질문이다 | **PASS**. 공급자 마케팅 없음 | **FAIL**. 창업자의 막걸리 경험을 추정 | **FAIL**. 외국인 관광객을 지불자로 적음 | **FAIL**. 참가비 문장 끝에 `(가설)`. 네 항목의 `가설:` 없음 | **FAIL**. 표시 없음 |
| 공급자 마케팅 | **PASS**. 같은 방식 | **FAIL**. 페이지 대행의 수주·범위·지불 대신 추가 서비스를 묻는다 | **FAIL**. 선택지가 질문 형태다. 투자 의향 한 줄만 지불과 닿는다 | **PASS**. 관광객 체험 없음 | **FAIL**. 디자인 경험을 만듦. 요약에 매출 증대 | **FAIL**. 공장 운영자를 지불자로 단정 | **FAIL**. 수수료와 유지관리 비용 뒤에 `(가설)` 하나. 유지관리 비용은 입력에 없다 | **FAIL**. 표시 없음 |

세 입력 모두 수익 `revenueModel` 타입은 문자열이다. 항목별 `가설: 체험 참가비`, `가설: 수수료`, `가설: 수익 공유`, `가설: 마케팅 서비스 수수료`는 없다. 독립 생성 품질은 **FAIL**이다. 파서 수용은 그 실패를 통과로 바꾸지 않는다.

## 테스트

`pnpm exec vitest run features/business-validation-journey/lib/__tests__/ai-pm-quality-compare.test.ts` 는 15 passed다. 모델 호출이 아니다. 위 세 호출과 따로 집계한다. 이번 턴의 앱 `next build`는 다시 실행하지 않았다. 이 커밋의 Vercel 배포는 기록 시각에 `pending`이었다. 모델 호출은 그 빌드의 `next build` 전에 저장되었다.

## 잔여

Q9·Q10은 Preview 로그인 계정이 있어야 실행할 수 있다. 원문만 넣은 `quality-2`는 질문·사실·지불자·수익 항목에서 실패했다. 기본값을 `quality-12`로 바꾸지 않았다.
