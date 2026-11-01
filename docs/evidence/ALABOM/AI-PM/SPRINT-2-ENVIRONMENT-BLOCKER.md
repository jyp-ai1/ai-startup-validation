# Sprint 2 실행 환경 장애

2026-11-01 21:40 KST. PR #226. 기준 커밋 `e5764870`.

이 문서는 최종 완결 보고가 아니다. `SPRINT-2-FINAL-COMPLETION.md`는 작성하지 않았다. 1~4차 GPT 실호출은 NOT RUN이다. Sprint 2 PASS는 선언하지 않는다. Sprint 2는 PARTIAL이다.

## 확인

| 항목 | 결과 |
| --- | --- |
| 판단 계약 모듈 `ai-pm-decision-contract.ts` | `e5764870`에 유지. 다시 작성하지 않음 |
| 실행기 `ai-pm-decision-contract-run.ts` | 유지. 다시 작성하지 않음 |
| 단위 테스트 9건 | `a74b5fc3` 구현, 2026-11-01 21:34 KST 재실행 통과. 이번 확인에서 테스트를 지우거나 기준을 낮추지 않음 |
| `ai-pm-review.ts` | 수정하지 않음 |
| 실험 B 하니스 | 수정하지 않음 |
| `GPT_API_KEY` | 프로세스에 없음 |
| `OPENAI_API_KEY` | 없음. 대체 호출에 쓰지 않음 |
| `VERCEL_ENV` | 없음. Preview로 식별되지 않음. Production도 아님 |
| `VERCEL_TOKEN` | 없음 |
| Vercel CLI | 설치되어 있지 않음 |
| GitHub Actions secrets 목록 | 이 통합 계정은 403이라 비밀 이름도 읽지 못함 |
| Cursor 환경 | Personal. `environment.json`은 이 실행에 노출되지 않음 |
| Founder 프로젝트 | 읽거나 쓰지 않음 |
| Production | 호출하지 않음 |
| 비밀키 | 저장소에 기록하지 않음 |

Supabase URL 변수는 프로세스에 있다. 그 주소로 데이터를 읽거나 GPT 키를 찾지 않았다.

## 미해결 장애

정식 Preview 권한과 `GPT_API_KEY`는 이 프로세스 밖에 있다. 그 경로가 없으므로 `gpt-4o` 1~4차 체인을 보내지 않았다. 다른 모델, 다른 하니스, 다른 입력으로 바꾸지 않았다.

이 장애가 남아 있는 동안 Sprint 2는 PARTIAL이다. 완료로 보고하지 않는다. Sprint 3~6과 Production 배포는 시작하지 않는다.

| 항목 | 상태 |
| --- | --- |
| Sprint 1 | PASS |
| 판단 계약 설계 | 승인 |
| 판단 계약 구현 | `a74b5fc3` 유지 |
| 단위 테스트 | 9건 PASS |
| GPT 실호출 1~4차 | NOT RUN |
| Priority Selection | NOT TESTED |
| 실행 환경 | 미해결 장애 |
| Sprint 2 | PARTIAL |
| Sprint 3~6 | 대기 |
| Production | LOCKED |
