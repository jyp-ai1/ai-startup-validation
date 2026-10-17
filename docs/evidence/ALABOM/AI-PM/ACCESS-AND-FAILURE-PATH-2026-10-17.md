# 접근 경로와 실패 재현 — 2026-10-17

전체 판정은 BLOCKED다. 비교 UI는 더 만들지 않았다. 실제 GPT·Gemini 원문은 없다. 테스트 문장 비교는 분석 품질 증거로 쓰지 않는다.

기준 커밋 `2a1c0fc0fe5318ae498c22c64fea629e650cb8d1`. PR #199는 초안이다. 병합과 Production 배포는 없다.

## 1. 원문

BLOCKED. Chrome 쿠키 호스트는 `.vercel.com`, `vercel.com`, Preview 호스트 하나다. ChatGPT, OpenAI, Gemini, Google 호스트는 없다.

수동 실행이 필요하다. 입력 파일은 `experiments/business-judgment-poc/prompt.txt` 그대로다. GPT 웹에 그 파일 전체를 넣고 응답 원문을 바꾸지 않고 저장한다. 그 원문과 같은 입력을 Gemini 웹에 넣어 반론 원문을 따로 저장한다. 실행 시각과 파일 경로를 적는다. 이 환경에서는 그 단계를 실행하지 않았고, 원문을 만들지 않았다.

비교 단계 B는 그 두 파일이 생기기 전에 진행하지 않는다.

## 2. Production 404

Production `/api/build-info` 커밋은 `0b465226516e1a4f3eb9ce2087f8bca2c2c091da`다. `origin/main`과 같다. 라우트 파일 `apps/web/app/[locale]/(public)/business-validation/page.tsx`는 브랜치에만 있다. 처음 들어온 커밋은 `9aa94edd`다. `origin/main`에는 그 경로가 없다.

브라우저로 연 `https://ai-startup-validation-tau.vercel.app/ko/business-validation`은 HTTP 404이고 본문은 `페이지를 찾을 수 없습니다`다. 로그인 화면이 아니다.

`apps/web/middleware.ts`는 이 경로를 다른 주소로 보내지 않는다. `legacy-route-redirects.ts`는 `/validation`만 `/workspace`로 보낸다. `/business-validation` 항목은 없다. 404 원인은 배포 커밋에 페이지 파일이 없는 것이다.

## 3. Preview와 공개 데모

Preview `https://ai-startup-validation-rfbflq6t9-jyp-ai1s-projects.vercel.app/ko/business-validation`은 비로그인 시 302로 `vercel.com/sso-api`에 간다. 배포 상태 `Deployment has completed`와 별개다. `VERCEL_TOKEN`은 없다. SSO를 끄거나 우회하지 않았다.

CEO가 로그인 없이 여는 화면은 Production ` /workspace?demo=guided&sample=clinicflow&fresh=1 `이다. HTTP 200이고 Clinicflow Demo다. Sample Playback이 보인다. 이 화면은 `/ko/business-validation`이 아니고, 실패 1·2·5의 입력도 아니다.

로컬에서 `/ko/workspace?demo=guided&sample=clinicflow&fresh=1`은 `/auth/login?next=/workspace`로 넘어가며 `demo` 쿼리가 빠진다. 미들웨어의 데모 쿠키 설정은 경로가 정확히 `/workspace`일 때만 동작한다.

## 4. 실패 1·2

기대는 저장 파일 기준이다. 실패 1 `experiments/business-judgment-poc/path1.json`은 A2와 S3 `예상 연매출 10억`이 없고 Fact는 false다. 실패 2 `path4.json`은 원장 없이 Fact가 true다. 제품 화면이 이 두 파일을 열지 않는다. Production Demo는 Clinicflow라 그 입력과 기대를 브라우저에 보여줄 경로가 없다. 재현 경로를 새로 만들지 않았다.

## 5. 실패 5

수정하지 않았다. `interpret-answer-semantics.ts` 458행이 고객 정정이면 `factKey`를 `customer`로 두고, 550행 `validationTestability`의 `PARTIAL` 반환에 닿지 않는다. 747행이 `VALID`다.

로컬 `/workspace?demo=guided&sample=clinicflow&fresh=1`에서 답변 칸 `answer-input`은 `readOnly: true`다. `workspace-ai-pm-main.tsx`는 `demoSamplePlayback`이면 루프 패널을 읽기 전용으로 둔다. 보이는 질문 문구는 `그 차별점이 고객에게 왜 중요한가요?`이고, Sample Playback은 Clinicflow의 다른 확인 답을 재생한다. 실패 5 문장 `정정합니다. 초기 타깃은 방한 FIT 외국인만이 아니라, 국내 MZ 개별 여행객도 포함합니다.`는 입력되지 않았다.

Production Demo에는 같은 테스트 아이디의 답변 칸이 로드된 화면에 없었다. Playback만 확인했다. 로그인 워크스페이스는 Google 계정 화면이라 열지 않았다.

수정 전 브라우저 결과가 없으므로 로직을 바꾸지 않는다.

## 6. 화면 기록

`docs/evidence/ALABOM/AI-PM/access-path-2026-10-17/`

| 파일 | 내용 |
| --- | --- |
| `prod-0.png` | Production 404 |
| `prod-1.png` | Production Clinicflow Demo |
| `prod-2.png` | Production `/ko/workspace` |
| `local-guided-workspace.png` | 로컬 `/ko/workspace`가 로그인으로 이동 |
| `local-workspace-unlocalized.png` | 로컬 `/workspace` Demo |
| `local-failure5-readonly.png` | 읽기 전용 답변 칸 |

## 7. 비용

외부 AI API 0건. 소비자 웹 자동화 0건. 신규 유료 서비스 0건. 호스팅 청구서는 읽지 않았다.
