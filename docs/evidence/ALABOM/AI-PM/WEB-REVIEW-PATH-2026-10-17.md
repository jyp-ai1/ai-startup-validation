# 원문과 비교 경로 — 2026-10-17

전체 판정은 BLOCKED다. 빌드 성공과 Preview 배포 완료를 제품 검증으로 세지 않는다.

## 1. 실제로 확보한 증거

| 증거 | 있음 | 내용 |
| --- | --- | --- |
| GPT 웹 원문 | 없음 | 쿠키 호스트는 `.vercel.com`, `vercel.com`, Preview 호스트 하나. ChatGPT·OpenAI·Gemini·Google 호스트 없음 |
| Gemini 웹 원문 | 없음 | 같은 확인. 웹 화면을 열지 않았고 자동화하지 않음 |
| 테스트 문장의 저장·재조회 | 로컬만 | `http://127.0.0.1:3010/ko/business-validation`. 문장 구분은 테스트 문장. 새로고침 뒤 GPT·Gemini 칸의 보관 문장이 남음 |
| 테스트 문장의 비교 | 로컬만 | 합의 S1, 충돌 S3·A2, 근거 부족에 원장과 빠진 S2·S4·S5·S6·A1, 다음 행동은 주문 원장. `verifiedFact false` |
| 실패 1·2·5 브라우저 | 없음 | 실패 5 분기는 458행이 550행보다 앞이다. 코드는 바꾸지 않음 |
| Production 화면 | 404 | SHA `0b465226516e1a4f3eb9ce2087f8bca2c2c091da` |

로컬에 붙인 문장은 `web-review-comparison.test.ts`의 테스트 문장이다. GPT나 Gemini가 쓴 원문이 아니다.

화면 기록: `docs/evidence/ALABOM/AI-PM/web-review-local-2026-10-17/local-comparison.png`, `local-reload.png`.

보관은 기존 `sessionStorage` 키 `alabom.validationJourney.v1`이다. 같은 탭에서 다시 읽힌다. 서버 저장이나 다른 브라우저 저장은 아니다.

## 2. 차단 단계

| 단계 | 상태 |
| --- | --- |
| 인증 | BLOCKED. GPT·Gemini 웹 세션이 없다. 원문 확보는 그 세션이 있는 환경에서 해야 한다 |
| 라우트 | Production `/ko/business-validation` 404. 파일은 브랜치에만 있고 `origin/main`에는 없다 |
| 기능 | 브랜치에 두 칸과 합의·충돌·근거 부족·다음 검증이 있다. 실제 원문으로 확인하지 못했다. 실패 1·2를 보여주는 제품 화면은 없다 |
| 배포 | Production SHA와 이 브랜치는 다르다. Preview 비로그인은 Vercel SSO다. 배포 완료만으로 브라우저 완료가 아니다 |

## 3. 비교 구현

`storeWebReview`는 `web-review-gpt`와 `web-review-gemini`를 따로 보관하고 다시 넣을 때 그 칸만 바꾼다. `judgmentText`는 유지한다. `verifiedFact`는 false다. 모델 문장에 원장이라고 있어도 사실로 올리지 않는다.

비교 기준은 `experiments/business-judgment-poc/prompt.txt`의 S1–S6, A1–A2다. 화면의 복사 입력은 `WEB_REVIEW_PROMPT`다. API 패킷 `CROSS_REVIEW_MODELS`로는 보내지 않는다.

## 4. 실패 5

`interpret-answer-semantics.ts` 458행은 고객 정정이면 `factKey`를 `customer`로 둔다. 550행 `validationTestability`와 그 아래 `PARTIAL` 반환은 그 분기 때문에 실행되지 않는다. 747행이 `VALID`다. 브라우저에서 그 입력의 수정 전 화면을 열지 못했다. 수정하지 않았다.

## 5. 비용

외부 AI API 0건. 소비자 웹 자동화 0건. 신규 유료 서비스 0건. 호스팅 청구서는 읽지 않았다.

## 6. 다음 실행

GPT 웹 세션에서 `prompt.txt` 원문을 받고, 그 원문과 같은 입력을 Gemini 웹에 넣어 반론 원문을 받는다. 그 두 원문을 이 화면의 두 칸에 넣고 합의, 충돌, 근거 부족, 다음 검증을 남긴다. 그 전에 이 기능을 완료로 적지 않는다. Production에 라우트를 올리려면 병합과 공개 배포가 필요하며, 그 전에는 404다. Preview SSO는 빌드와 별도로 남는다.
