# 실패 1·2 원인과 판정 규칙 — 2026-10-17

전체 판정은 BLOCKED다. PR #200을 병합하지 않았고 Production에 배포하지 않았다. Production SHA는 `0b465226`이다. 실패 5 로직은 바꾸지 않았다. GPT·Gemini 원문은 없다. 외부 AI API 0건, 웹 자동화 0건, 신규 유료 서비스 0건.

공개 화면 `/[locale]/business-validation`은 비교 전용 칸이 아니다. 제목은 `내 사업 이해하기`이고 `WebReviewPanel`은 그 여정의 한 구간이다. 이번 수정은 그 화면 파일을 바꾸지 않았다. `decide-next-question-from-review.ts`, `providers/index.ts`, `openai-counter-review-provider.ts`는 여전히 diff에 없다.

## 1. 실패했던 4개 테스트의 수정 전 값

입력은 `experiments/business-judgment-poc/prompt.txt`의 `입력` 구간이다. 그 구간에 A2 문장과 `S3: 모회사와 상품 공급 계약 체결 (예상 연매출 10억)`이 있다. 그 구간에 `원장`, `결제`, `입금`, `세금계산서`는 없다. 지시문 앞부분의 `원장`이라는 단어는 증거 문장이 아니다.

제품 코드는 이 JSON을 생성하지 않는다. 누락과 Fact true는 저장된 모델 출력 안에 있다.

| 테스트 | 기대 | 수정 전 실제 |
| --- | --- | --- |
| path1 출력에 `A2` | true | false. content는 A1 문장만 있다. 모델 `gpt-oss-20b`, id `pllns_ad8b0ebe46b1c7533e046a2c0e703f36` |
| path1 출력에 `예상 연매출` 또는 `10억` | true | false. 같은 content |
| path4 출력에 `예상 연매출` 또는 `10억` | true | false. content는 비중과 유지 불가를 한 Claim으로 합친다. 모델 `qwen2.5:3b` |
| path4 Fact | false | true. `output_parse.object.Fact` |

path4의 `유지할 수 없다`는 수정 전에도 content에 있어 그 테스트는 PASS였다.

## 2. Fact가 true로 남는 경로

`path4.json`의 `output_parse.object.Fact`가 true다. `recordExternalAnalysis`는 그 필드를 읽지 않는다. 붙여넣은 문자열을 노트 `text`에 그대로 두고 `verifiedFact: false`를 상수로 넣는다. 그 상수는 모델 Fact를 거절한 판정이 아니다. 모델이 쓴 true는 노트 문장 안에 그대로 남는다.

## 3. 최소 수정

`apps/web/features/business-validation-journey/lib/stored-model-judgment.ts`의 `judgeStoredModelOutput`.

- 모델 JSON 파일은 고치지 않는다.
- 입력 구간의 A2 행, S3 행만 후보로 쓴다. 입력에 없는 수치를 만들지 않는다.
- 모델 content가 A2 표지(`A2`, `유지할 수 없`, `지원이 필수`)를 이미 포함하면 A2를 덧붙이지 않는다. path4는 여기에 해당한다.
- 모델 content가 `예상 연매출`, `10억`, `십억`을 포함하지 않으면 입력의 S3 행을 `입력에 있고 모델 출력에 없음:` 뒤에 붙인다. path1의 A2도 같은 방식이다.
- 입력 구간에 원장 표지가 없으면 모델 Fact가 true여도 판정 Fact는 false다.
- `verifiedFact`는 false다. 이 값은 모델 Fact 통과의 증거가 아니다. path4의 통과 증거는 판정 Fact가 false인 것이다.

화면은 이 함수를 import하지 않는다. 경계 테스트가 `validation-journey-screen.tsx`에 `stored-model-judgment`와 `judgeStoredModelOutput`이 없음을 확인한다.

## 4. 수정 후 테스트

같은 7파일을 다시 실행했다. 43개 통과, 종료 코드 0. 그중 이전 회귀 34개와 재현 9개다.

재현 9개의 수정 후 결과:

| 검사 | 결과 |
| --- | --- |
| path1 수신 | PASS |
| path1 A2 | PASS. 원본 content에는 `A2`가 없고, 판정 출력에는 입력의 A2 행이 있다 |
| path1 예상 연매출 | PASS. 원본 content에는 없고, 판정 출력에는 입력의 S3 행이 있다 |
| path1 Fact | PASS. 모델 Fact false, 판정 Fact false |
| path4 수신 | PASS |
| path4 `유지할 수 없다` | PASS. 모델 content에 있다 |
| path4 예상 연매출 | PASS. 원본 content에는 없고, 판정 출력에는 입력의 S3 행이 있다 |
| path4 Fact | PASS. 모델 Fact는 true인 채로 남고, 판정 Fact는 false, `verifiedFact`는 false |
| `recordExternalAnalysis` 상수 | PASS. 노트 문장에 `"Fact": true`가 있어도 상수 `verifiedFact`는 false. 이것은 path4 Fact 판정의 통과 증거가 아니다 |

## 5. 실패 5

BLOCKED. `interpretAnswerSemantics`는 수정하지 않았다.

재현에 필요한 조건:

1. Supabase가 설정되어 `listMyProjectsForPage`의 `dbReady`가 true일 것. 설정이 없으면 프로젝트 목록만 반환하고 루프를 열지 않는다.
2. `requireAuthUser`를 통과하는 로그인 세션.
3. 그 사용자가 소유한 `project` 쿼리. 소유가 아니면 `/workspace`로 돌아간다.
4. `demo` 쿼리가 `guided`, `readonly`, `1`이 아닐 것. `sample`과 `fresh=1`이 함께 있으면 Demo 세션이다.
5. `WorkspaceAiPmLoopPanel`의 `readOnly`가 false일 것. `submitAnswer`는 1612행에서 `readOnly`이면 함수 호출 전에 반환한다.
6. 화면에 나온 질문의 gap이 `validationTestability`일 것.
7. 제출 문장은 `정정합니다. 초기 타깃은 방한 FIT 외국인만이 아니라, 국내 MZ 개별 여행객도 포함합니다.`

이 환경의 쿠키 호스트는 `.vercel.com`, `vercel.com`, Preview 호스트 하나다. 로그인 세션이 없다. Production `GET /ko/workspace`는 `/auth/login?next=%2Fworkspace`로 보낸다. 문장을 제출하지 않았고 반환값을 만들지 않았다. Demo 결과를 재현으로 세지 않는다.

## 6. 원문과 Production

BLOCKED / NOT RUN. ChatGPT, OpenAI, Gemini, Google 계정 쿠키는 없다. `prompt.txt`를 웹에 넣지 않았다. 원문 파일을 새로 쓰지 않았다. 담당자가 인증된 브라우저에서 그 파일을 그대로 실행하면, GPT 원문과 Gemini 반론을 각각 바꾸지 않고 시각과 경로를 남기는 요청으로 둔다. 두 원문이 생기기 전에는 비교 품질을 판정하지 않는다.

PR #200 빌드와 이번 테스트 통과는 사용자 접근이나 Production 검증이 아니다. `/ko/business-validation`은 Production에서 404다.
