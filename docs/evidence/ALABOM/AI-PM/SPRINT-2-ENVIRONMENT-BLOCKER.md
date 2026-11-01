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

## 배포 경로 조사

2026-11-01 21:46 KST. 기준 커밋 `1a80a405`. 새 Actions 워크플로와 새 실행 스크립트는 만들지 않았다. 실호출은 시작하지 않았다.

| 조사 | 결과 |
| --- | --- |
| GitHub Actions workflow | 0개. Actions에 비밀을 연결할 기존 워크플로가 없음 |
| GitHub Environments | 이름 `Preview`, `Production`이 있다. 보호 규칙은 비어 있다. 워크플로가 없어 실행 경로가 아니다 |
| 저장소 관리자 | API로 조회된 admin은 `jyp-ai1` 하나다. 이 통합 계정의 저장소 권한은 admin이 아니다. secrets 목록은 403이다 |
| 기존 GPT 실행 경로 | Vercel 팀 `jyp-ai1s-projects`, 프로젝트 `ai-startup-validation`. Preview 빌드가 `apps/web/scripts/run-web-build.sh`를 실행한다. `VERCEL_ENV=preview`이고 브랜치가 `main`이 아닐 때만 기존 live 테스트를 연다. 판단 계약 실호출 파일은 그 스크립트에 없다 |
| 최근 Preview 배포 | `vercel[bot]`이 만들며 상태가 failure다. 이 프로세스에는 Vercel 토큰이 없어 `vercel inspect` 로그를 읽지 못한다 |
| Production 배포 | 최근 기록은 2026-10-08, 커밋 `0b46522`. 호출하지 않음 |

실패로 기록된 Preview 배포:

| 커밋 | 배포 |
| --- | --- |
| `1a80a405` | `dpl_2fP9BVCCWCK35tGkTjCbEWWFftus` |
| `e5764870` | `dpl_HsFBZhArJ1ZCRRgnAAyz8mnPS998` |
| `a74b5fc3` | `dpl_BZdVENo63uDNc9WRfoDeRtXWPYHQ` |

배포가 failure인 상태와 로그를 읽지 못하는 상태는 Preview 확보의 증거가 아니다. `GPT_API_KEY`가 Preview에 있는지는 확인하지 못했다.

## 관리자 설정

값은 채팅이나 저장소에 넣지 않는다. 필요한 항목은 다음이다.

1. Vercel 프로젝트 `ai-startup-validation`의 Preview 환경에 변수 이름 `GPT_API_KEY`가 있는지 확인한다. Production 환경 변수로 이 실증을 열지 않는다.
2. 위 세 배포의 빌드 로그를 열어 failure 원인을 확인한다. 이 에이전트에 Preview 배포 로그를 읽을 Vercel 권한을 Cursor 비밀로 연결한다. 토큰 문자열은 저장소와 채팅에 쓰지 않는다.
3. 그 확인 뒤에만 기존 Preview 빌드 경로에서 판단 계약 1~4차를 연다. GitHub Actions 워크플로를 새로 만들지 않는다.

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
