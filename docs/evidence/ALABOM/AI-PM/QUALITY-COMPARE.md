# quality-2 / quality-3 비교 호출

2026-10-29 12:54 KST. 제품 프롬프트와 2차 호출 경로는 바꾸지 않았다. Production은 잠금이다. PR #209는 병합하지 않는다.

전달 문장과 빈 응답 칸은 `docs/evidence/ALABOM/AI-PM/quality-2-3-compare.json`에 있다.

| 항목 | 값 |
|---|---|
| 모델 | `gpt-4o-mini` |
| temperature | 0.2 |
| 출력 상한 | 2400 |
| 형식 | JSON |
| 사업 입력 | `juinjip11-input.txt` 본문과 `검토 목적: 종합 사업성 검토`, `현재 단계: 미확인`, `가장 알고 싶은 것: 없음`, `검토 계약: comprehensive-1` |
| `quality-2` | 제품 `buildFirstReviewRequest`와 같은 요청. 상태 `not_run`. 원문 없음 |
| `quality-3` | CPO 초안. 버전 표기 `quality-3-draft`. 상태 `not_run`. 원문 없음 |
| 실행 | **NOT RUN**. 이 프로세스에 `GPT_API_KEY`가 없다 |

혼란 변수:

- `quality-2` 사용자 키 목록에는 `alternatives`, `differentiation`이 없고 `quality-3`에는 있다. 응답 차이가 생겨도 시스템 지시만의 효과로 단정하지 않는다.
- `quality-3`를 제품 입력 예산에 넣으면 사용자 문장이 633자에서 218자로 잘린다. 비교 호출은 그 자르기를 쓰지 않고 전문을 보내도록 고정했다. 그 호출은 아직 실행되지 않았다.

회귀 A/B와 사업성 비교는 원문이 없어 **NOT RUN**이다. 1차 게이트는 **FAIL**이다.

## 2026-10-29 12:59 KST 실행 환경

비교 작업 상태는 **BLOCKED**다. `executeQualityCompare()`를 이 프로세스에서 다시 실행했고, 반환은 두 칸 모두 `not_run`이다. 그 테스트가 통과한 것은 키 없을 때의 반환을 확인한 것이며 모델 품질 통과가 아니다.

| 확인 | 결과 |
|---|---|
| 프로세스 | 클라우드 에이전트 `bc-e981acef-6442-4642-bef1-b0217b624b88` |
| 환경 | `316b619d-a743-11f1-a7d1-d6b4613131ce`. 개인 환경. `environment.json`은 이 런에 노출되지 않음 |
| 함수가 읽는 값 | `readGptApiKey()` → 프로세스 환경의 `GPT_API_KEY`만. 값은 없음 |
| 부팅 시 주입된 비밀 이름 | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| 주입 시점 | 에이전트 부팅. 이 목록에 `GPT_API_KEY`가 없다 |
| 이 프로세스 재시작 | 환경에 저장되지 않은 비밀을 불러오지 않는다 |
| `.env` | 없음 |
| 네트워크 | 외부 호출 제한 없음. 막힌 이유는 키가 없는 것이다 |
| 셀프호스트 워커 | 연결된 머신 0 |
| Vercel CLI | 토큰 없음. Preview 환경 변수를 읽지 못함 |
| 저장소 GitHub Actions | 워크플로 파일 없음 |

Preview에 남아 있는 과거 OpenAI 호출은 제품 검토 라우트다. `executeQualityCompare()`가 아니고 `quality-3` 초안을 보내지 않는다. 그 경로로 대체하지 않았다.

2026-10-29 13:13 KST. 같은 프로세스에서 `executeQualityCompare()`를 다시 호출하지 않았다. 비교 실행은 **BLOCKED**다. 이 클라우드 에이전트 프로세스는 `GPT_API_KEY`를 읽지 못한다. Preview 프로젝트 `jyp-ai1s-projects/ai-startup-validation`의 제품 서버는 그 이름으로 OpenAI 호출에 성공했다. 그 서버는 당시 `executeQualityCompare()`를 실행하지 않았고 `quality-3-draft`를 보내지 않았다. 저장된 제품 응답은 이 비교의 원문이 아니다.

## Preview 빌드 1회 실행

비교 함수를 클라우드 에이전트 프로세스가 아니라 Preview 빌드의 `pnpm --filter web build` 안에서 실행한다. 스크립트는 `apps/web/scripts/preview-quality-compare-once.mjs`다. 요청 본문은 `quality-compare-requests.json`에 고정했고, 빌더는 그 파일과 같아야 한다. 스크립트가 실패해도 `next build`는 이어서 실행된다. Production에서는 호출하지 않는다.

| 조건 | 동작 |
|---|---|
| `VERCEL_ENV=preview` 이고 브랜치가 `main`이 아님 | 고정 JSON의 두 요청을 OpenAI에 각 1회 |
| Production, `main`, 로컬 빌드 | 호출 없이 종료 |
| 같은 run id의 최종 기록이 이미 있음 | 재호출 없음 |

run id는 `q1-preview-brewery-2026-10-29`다. 요청은 고정된 `quality-2`와 `quality-3-draft`다. 사업 입력 전문을 보내고 제품 입력 예산으로 자르지 않는다. 제품 2차 검토 경로는 호출하지 않는다. 제품 프롬프트는 `quality-2`다. 키 값은 로그, 응답, Git에 넣지 않는다.

결과 JSON은 비공개 버킷 `ai-pm-quality-compare`의 객체 `q1-preview-brewery-2026-10-29.json`에 저장한다.

## 2026-10-29 14:08 KST 실행 결과

비교 호출은 **BLOCKED**다. 1차 품질 게이트는 **FAIL**이다. 응답 원문은 없다. 품질 비교와 회귀 A/B는 **NOT RUN**이다.

Preview 배포가 비교 기록을 만들기 전에 실패했다. 비공개 버킷 객체는 만들지 않았다. 따라서 빌드 프로세스가 `GPT_API_KEY`를 읽었는지는 확인되지 않았다. 이 클라우드 에이전트 프로세스에는 그 키가 없고, Vercel 토큰도 없어 빌드 로그를 읽지 못했다. 배포 URL은 Vercel SSO로 막혀 있다.

| 시각 KST | 커밋 | GitHub deployment | 상태 |
|---|---|---|---|
| 13:30 | `a740cd2e` | `7404087356` | failure. `dpl_y8E3JaZUzYToMd1sfcaD4Vy1fLLj` |
| 13:52 | `e7c8396c` | `7404364983` | failure. `dpl_HAzLSxMXRM3RfU1tbMDY2PfUbyHP` |
| 14:08 | `0a05ddc5` | `7404573527` | failure. `dpl_6fBbDXSu7jbVy7GtsSB4aabkhhG5` |

마지막 성공 Preview는 `bdbd792e`, deployment `7403599728`, 12:52 KST다. 그 커밋에는 이번 비교 코드가 없다. 로컬 `pnpm run build`는 비교 스크립트를 건너뛴 뒤 타입 검사까지 통과했다. Vercel이 수 초 안에 failure를 남긴 이유의 로그는 이 프로세스에서 열리지 않는다. 같은 실패를 반복 호출하지 않았다.

제품 프롬프트는 `quality-2`다. 제품 2차 검토는 호출하지 않았다. Production 잠금 `0b465226516e1a4f3eb9ce2087f8bca2c2c091da`와 PR #209 미병합은 유지한다.
