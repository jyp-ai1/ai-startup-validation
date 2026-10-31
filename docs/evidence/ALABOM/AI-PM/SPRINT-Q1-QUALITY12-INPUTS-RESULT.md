# Sprint Q1 quality-12 — 세 입력

quality-12 모델 출력은 세 입력 모두 질문·선택지·파서 계약을 통과했다. 이것은 1차 검증 완료가 아니다. Q9·Q10은 BLOCKED다. 기본값은 `quality-2`다. Production 잠금은 유지했다. quality-8·quality-9 원문은 바꾸지 않았다. quality-10·quality-11 실패 원문도 별도 파일로 남겼다.

원문은 `sprint-q1-quality12-inputs-recorded.json`이다. 실행 SHA `7d9b327891966bed4dd31104a8ecaccb30c8915f`. 시작 2026-10-29 17:46:22 KST, 종료 17:46:39 KST. 모델 `gpt-4o-mini-2024-07-18`, temperature 0.2, max tokens 2400, JSON, finish `stop`. 비교 기록의 `productFollowUpInvoked`는 false다. 이 값만으로 브라우저 후속 호출이 없었다고 보지 않는다.

프롬프트 버전은 `quality-12-cpo-draft:brewery`, `quality-12-cpo-draft:experience`, `quality-12-cpo-draft:supplier`다. 질문, 선택지, 수익 문자열, 사실, 추론은 사용자 메시지의 칸에 적혀 있었고 모델이 그 값을 복사했다. 복사 성공은 그 칸을 스스로 고안했다는 증거가 아니다. 체험·공급자 추론은 `미확인`이다. 없는 해석을 만들지 않은 것이고, 풍부한 추론이 나온 것은 아니다.

## 모델 출력

| 입력 | 파서 | 질문 | 선택지 | 없는 축 | 요약 | 지불자 | 수익 항목 | 사실·추론 |
|---|---|---|---|---|---|---|---|---|
| 양조장 | PASS | PASS. `무엇을 먼저 검증할 것인가?` | PASS. 체험, 마케팅 지원, 결합, 미결정, 기타 | PASS | PASS. 체험과 마케팅 지원 | PASS. `미확인` | PASS. 네 항목 모두 `가설:` | PASS. 사실은 입력 두 문장. 추론은 지정된 한 줄의 복사 |
| 체험만 | PASS | PASS. `막걸리 만들기체험에서 무엇을 먼저 확인할 것인가?` | PASS. 수요, 운영, 참가비 지불, 미결정, 기타 | PASS. 공급자 마케팅 없음 | PASS | PASS. `미확인` | PASS. 참가비 포함 네 항목 모두 `가설:` | PASS. 입력 문장. 추론 `미확인` |
| 공급자 마케팅 | PASS | PASS. `온라인 마케팅 페이지 대행에서 무엇을 먼저 확인할 것인가?` | PASS. 수주, 범위, 수수료 지불, 미결정, 기타 | PASS. 관광객 체험 없음 | PASS | PASS. `미확인` | PASS. 수수료 포함 네 항목 모두 `가설:` | PASS. 입력 문장. 추론 `미확인` |

양조장 기존 게이트 Q1–Q7은 pass다. Q8은 그 함수가 저장을 하지 않아 `not_run`으로 남는다. 제품 파서는 세 원문을 분석으로 읽었다. 로컬 SQLite에 넣고 다시 읽었을 때 수익 문자열과 `payer=미확인`이 그대로였다. 그 재조회는 Preview 계정 행이 아니다.

## 앞선 실패

| 후보 | 실행 SHA | 시각 (KST) | 결과 |
|---|---|---|---|
| quality-10 | `7042259fcde12fbfe656c9f8e4f8c9432f3c0a91` | 17:35:42–17:35:57 | **FAIL**. 선택지 배열은 맞았다. 수익은 한 항목으로 줄었다. 양조장 질문은 선택지 첫 줄이었다. 증거 `sprint-q1-quality10-inputs-recorded.json` |
| quality-11 | `475903ec07c225d9a8af86890534c96908e3f0f4` | 17:42:42–17:42:52 | **FAIL**. 질문·선택지·수익 문자열은 맞았다. `키 값: 미확인` 한 줄 칸이 빠져 파서가 `unstructured_response`였다. 증거 `sprint-q1-quality11-inputs-recorded.json` |
| quality-12 | `7d9b327891966bed4dd31104a8ecaccb30c8915f` | 17:46:22–17:46:39 | 세 입력 계약 통과. 이 파일 |

## 코드

질문과 선택지는 `quality10Branch`가 입력 축으로 고른다. 양조장 선택지를 다른 사업에 넣지 않는다. 수익은 항목마다 `가설:` 또는 `사실:`인 문자열이다. 모델이 서술 칸을 빼면 그 칸만 `미확인`으로 채운다. 질문이 없거나, `choices`가 배열이 아니거나, `revenueModel`이 문자열이 아니면 복구하지 않고 실패로 남긴다. 선택지나 가격은 만들지 않는다. quality-12 원문은 그 칸을 이미 포함하고 있어서, 이번 통과는 복구에만 기대지 않는다.

## 테스트와 빌드

단위 테스트는 모델 호출이 아니다.

- `pnpm exec vitest run features/business-validation-journey/lib/__tests__/ai-pm-quality-compare.test.ts` — 14 passed
- `pnpm exec vitest run features/business-validation-journey/lib/__tests__/ai-pm-review.test.ts` — 18 passed
- 모델 호출은 위 표의 세 후보다. 단위 테스트 통과만으로 범용성을 통과로 보지 않는다.
- 로컬 `pnpm exec next build`는 `next dev` 두 프로세스가 같은 `.next`를 쓰는 동안 `/ko/business-validation` 프리렌더에서 실패했다. 같은 커밋을 `NEXT_DIST_DIR=.next-q12 pnpm exec next build`로 다시 실행하면 exit 0, `Compiled successfully in 44s`다. 그 설정 변경은 되돌렸다.

## Q9·Q10

BLOCKED. 2026-10-29 17:47 KST에 `npx vercel whoami`는 `Logged out`이었다. `VERCEL_TOKEN`은 없다. `GET https://ai-startup-validation-fvqqfcdr8-jyp-ai1s-projects.vercel.app/workspace` 는 `Accept: application/json`에서 HTTP 401, `Protected by Vercel Authentication`이다. 인증 우회는 하지 않았다. 로그인, 저장, 새로고침, 재인증, 브라우저 요청, 서버 호출 로그는 실행하지 않았다.

Q9·Q10을 실행하려면 Preview 배포에 로그인할 수 있는 Vercel 계정이 필요하다.
