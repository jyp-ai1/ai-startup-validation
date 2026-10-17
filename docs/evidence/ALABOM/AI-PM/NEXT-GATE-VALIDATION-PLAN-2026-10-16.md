# 1단계 탐지 공백 — 검증 계획 — 2026-10-16

이 문서는 검사기를 구현하지 않는다. 제품 코드, 엔진 순서, Production, PR 병합을 바꾸지 않는다. 모델 호출은 없다. 비용은 0원이다. 1단계 관문은 닫혀 있다. 이 계획의 작성은 1단계 통과가 아니다.

실패 1·2·5번은 미해결이다. 이 문서에서 해결로 적지 않는다.

통신 성공, JSON 파싱 성공, 로컬 92건 통과를 판단 정확도 검증 성공으로 쓰지 않는다.

앞으로의 순서 제안은 실패 탐지 가능성, 판단 정확도, 통신 안정성, 별도 승인이다. 이 순서는 제안이다. 기존 제품에서 검증이 끝난 절차가 아니다.

## 1. 증거와 도구의 연결

기준 기록. `AI-COMM-AND-ACCURACY-REVIEW.md`, `FAILURE-TRACE-2026-10-16.md`, `DETECTION-GAP-2026-10-16.md`, `experiments/business-judgment-poc/prompt.txt`, `path1.json`, `path4.json`.

| # | 입력 원본 | 기대 | 저장된 실제 | 기존 도구가 읽는가 | 읽는 조건 | 자동 탐지 | 미탐지 근거 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `prompt.txt` 10행 S3 `예상 연매출 10억`, 15행 A2 | A2와 S3 예상 매출이 출력에 있음. 원장 없으면 Fact false. 기대 문장은 `BUSINESS-JUDGMENT-POC.txt` | `path1.json` `content`. Fact false. `A2`, `10억`, `예상 연매출` 없음. id `pllns_ad8b0ebe46b1c7533e046a2c0e703f36` | 아니오. 실행 파일의 `path1.json` 참조 0건 | 해당 없음 | 아니오 | `DETECTION-GAP-2026-10-16.md`. ID 검증기 `main`은 네 ID 픽스처만 연다 |
| 2 | 같은 `prompt.txt` 6행. 원장·결제 증거 없음 | Fact false | `path4.json` `content`. Fact true | 아니오. `path4.json` 참조 0건 | 해당 없음 | 아니오 | 같은 기록. `recordExternalAnalysis`는 Fact 필드를 받지 않음 |
| 3 | `v3-runtime-certification.test.ts` 301–320행. 답 `음… 글쎄요` | decision.action `clarify` | 2026-10-16T10:39:10Z. review `clarify`, decision `advance` | 예. 그 테스트 | `decision.action`이 `clarify`인지 | 예. 실패로 남음 | 해당 없음. 탐지가 정상 동작을 의미하지 않음 |
| 4 | 같은 파일 685–801행 | `renderSurfaceFiveLines(whyAsk)[2]`와 `decision.questionText`가 같음 | questionText는 중소기업 마케팅팀의 불편. 표면 줄은 `같은 주제를 조금 더 구체화하면 GO/HOLD 판단 근거가 강해집니다.` | 예. 그 테스트 | 두 문자열의 일치 | 예. 실패로 남음 | 의미 유사도를 따로 점수화하는 도구는 이 테스트에 없음. 문장 불일치는 문자열 비교로 탐지됨 |
| 5 | `core-final-stabilization.test.ts` 989–996행 | quality `PARTIAL` | 같은 실행. quality `VALID` | 예. 그 테스트 | `result.quality`가 `PARTIAL`인지 | 예. 불일치를 실패로 봄 | 해결되지 않음. `mergeable`은 단정 전에 중단. 미확인 |

## 2. 검증 명세

명세다. 구현이 아니다.

### 1. path1의 A2·S3 누락

- 검증 조건. 저장된 `content`에 A2 문장과 S3의 `예상 연매출 10억`이 없으면 실패. Fact false만으로는 통과하지 않음.
- 현재 증거. `prompt.txt`, `path1.json`, `BUSINESS-JUDGMENT-POC.txt`.
- 현재 탐지. 자동 탐지 없음.
- 미확인. 모델 재호출은 하지 않음. 사람이 파일을 다시 읽는 것 외에 실행 가능한 검사는 없음.

### 2. path4의 Fact true

- 검증 조건. 입력에 원장이나 결제 증거가 없는데 Fact가 true이면 실패. `verifiedFact` 상수 false는 이 조건의 통과가 아님.
- 현재 증거. `prompt.txt` 6행, `path4.json` Fact true.
- 현재 탐지. 자동 탐지 없음. `judgment-development.test.ts`는 상수 false만 보고 path4를 넣지 않음.
- 미확인. 그 JSON을 `recordExternalAnalysis`에 넣었을 때의 동작은 이번 작업에서 실행하지 않음. 코드가 Fact 키를 읽지 않는다는 것은 `judgment-development.ts` 102–121행으로 확인됨.

### 3. V3-03

- 검증 조건. 모호한 답에서 decision.action이 `clarify`가 아니고 `advance`이면 실패.
- 현재 증거. 위 테스트와 2026-10-16T10:39:10Z 결과.
- 현재 탐지. 테스트가 탐지. 제품 동작은 미수정.
- 미확인. 원인 수정은 하지 않음. 원인 분석의 코드 변경은 범위 밖.

### 4. V3-12

- 검증 조건. 결정의 질문 문장과 표면 두 번째 줄이 다르면 실패.
- 현재 증거. 위 테스트의 두 문장.
- 현재 탐지. 문자열 불일치를 테스트가 탐지. 별도의 의미 채점기는 없음.
- 미확인. 두 문장의 의미 거리 점수는 없음. 문자열 불일치만 확인됨.

### 5. validationTestability

- 검증 조건. 그 입력의 quality가 `PARTIAL`이 아니면 실패.
- 현재 증거. 실제 quality `VALID`.
- 현재 탐지. 테스트가 불일치를 탐지. 미해결.
- 미확인. `mergeable`의 실제 값. 이번 실행은 quality 단정에서 멈춤.

## 3. 두 관문

서로 넘기지 않는다.

통신 관문. 닫힘. 익명 `gpt-oss-20b`만 모델 문장이 있고, 30초 간격 최초 8회는 7/8이다. 시간 초과 기록과 무료 한도·가동 보장 없음은 `INTERVAL-STABILITY-2026-10-16.md`, `ANON-OPS-LIMIT-2026-10-16.md`에 있다. 이 사실이 판단 정확도를 통과시키지 않는다.

판단 정확도 관문. 닫힘. 근거 없는 Fact 승격은 path4에 있고 자동 탐지가 없다. 중요 입력 누락은 path1에 있고 자동 탐지가 없다. 사용자 답변을 모델이 다시 분석한 실행은 미실행. 질문 전환의 V3-03·V3-12와 quality 불일치는 테스트가 실패로 남긴다. 기대와 실제의 자동 검증은 3·4·5에만 있고 1·2에는 없다.

## 4. 동결 비교

작업 전. 2026-10-16 측정. HEAD `55f7a81b`. `git diff --stat 6f71ea3a..HEAD -- apps packages` 출력 없음. `0b465226`은 HEAD의 조상. 엔진 마지막 수정은 `verification-action.ts` `b6bb8443`, `plan-journey.ts`와 `decide-next-question-from-review.ts` `134667d9`, `present-single-action.ts` `55586a62`. PR #199는 OPEN 초안. 이 측정에서 결제 호출은 없다.

작업 후. 커밋 `99980eea`. `git diff --stat 6f71ea3a..HEAD -- apps packages` 출력은 다시 비어 있다. 엔진 네 파일의 마지막 수정 SHA는 작업 전과 같다. 비용 발생 호출은 없다. 병합과 Production 배포는 없다.

## 5. 승인 기준

다음을 모두 만족하기 전에 1단계를 열지 않는다. 검사기 구현, 제품 통합, 엔진 변경은 이 기준의 충족이 아니고, 별도 지시 뒤에만 검토한다.

- 실패 1·2를 자동으로 실패라고 남기는 실행이 있거나, 없다는 상태가 이 문서처럼 유지될 것. 없음을 통과로 바꾸지 않음.
- 실패 5의 `VALID`/`PARTIAL`이 기대와 같아지거나, 미해결로 남을 것. 테스트가 실패를 보는 것만으로 해결이라 하지 않음.
- 통신 관문과 판단 관문을 각각 승인할 것. 한쪽 기록을 다른 쪽 통과로 쓰지 않음.
- `apps/`·`packages/`가 `6f71ea3a` 이후에도 비어 있고 Production `0b465226`이 잠금으로 남아 있을 것.

2단계와 3단계는 그 승인 전에 착수하지 않는다.
