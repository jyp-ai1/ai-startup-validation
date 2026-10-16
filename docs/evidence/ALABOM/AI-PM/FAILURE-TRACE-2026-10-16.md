# 실패 다섯 건의 추적 — 2026-10-16

새 모델 호출은 없다. 제품 코드, 엔진 순서, 병합, Production은 바꾸지 않았다. 비용은 0원이다. 1단계 관문은 닫혀 있다. 2단계와 3단계는 착수하지 않는다.

`validationTestability`의 `VALID`와 기준 `PARTIAL` 불일치는 미해결이다. `recordExternalAnalysis`가 `verifiedFact`를 false로 고정하는 것은 모델 Fact를 검증한 성공이 아니다.

## 추적

| # | 입력 | 기대 | 실제 | 자동 검사 |
| --- | --- | --- | --- | --- |
| 1 | `experiments/business-judgment-poc/prompt.txt` 15행 A2, 10행 S3 `예상 연매출 10억`. 6행. Fact는 원장이나 결제 증거가 있을 때만 true | 출력에 A2와 S3의 예상 매출이 있고, 원장 없는 Fact는 false. 기대 문장은 `BUSINESS-JUDGMENT-POC.txt` | `path1.json`의 `content`. Fact false. 문자열 `A2`, `10억`, `예상 연매출` 없음. id `pllns_ad8b0ebe46b1c7533e046a2c0e703f36` | 없음. 모델 재호출 미실행 |
| 2 | 같은 프롬프트. 원장·결제 증거 없음 | Fact false | `path4.json`의 `content`. Fact true. Claim은 비중과 유지 불가를 한 문장으로 적음 | 없음. 모델 재호출 미실행 |
| 3 | `v3-runtime-certification.test.ts` 301–320행. 답 `음… 글쎄요`. 공백 `differentiationVsAlternatives` | decision.action `clarify` | 2026-10-16T10:39:10Z Vitest. review는 `clarify`. decision은 `advance` | 이 테스트가 실패로 탐지. 수정 없음 |
| 4 | 같은 파일 685–801행. 마지막 답 `콘텐츠 제작 시간` | `renderSurfaceFiveLines(whyAsk)[2]`와 `decision.questionText`가 같음 | questionText는 `중소기업 마케팅팀이 가장 크게 겪는 불편은 무엇인가요?`. 표면 줄은 `같은 주제를 조금 더 구체화하면 GO/HOLD 판단 근거가 강해집니다.` | 이 테스트가 실패로 탐지. 수정 없음 |
| 5 | `core-final-stabilization.test.ts` 989–996행. 공백 `validationTestability`. 답은 고객 타깃 정정 문장 | quality `PARTIAL` | 같은 실행. quality `VALID`. `mergeable`은 단정 전에 중단되어 미확인 | 이 테스트가 quality 불일치를 탐지. 해결되지 않음 |

1번과 2번은 입력 파일과 출력 파일이 있다. 그 기대를 어긴 출력을 실패로 집계하는 제품 테스트는 없다. 파일로 다시 읽을 수는 있고, 테스트로 다시 실행되지는 않는다.

3번, 4번, 5번은 테스트 입력·기대·실제가 한 실행에서 이어진다. 5번은 실패가 남은 상태다. 통과로 두지 않는다.

## Fact 고정

`recordExternalAnalysis`는 `judgment-development.ts` 102–121행에서 `verifiedFact: false`를 상수로 넣는다. 함수는 모델 JSON의 Fact 필드를 인자로 받지 않는다. path4의 Fact true를 읽어 틀렸다고 남긴 기록이 아니다. 그 출력은 이 함수에 들어가지 않았다. 무시와 검증 성공은 다르다.

## 동결

`6f71ea3a..HEAD`의 `apps/`·`packages/` diff는 비어 있다. Production 잠금 `0b465226`은 HEAD의 조상이다. PR #199는 초안이다. 92건 로컬 통과는 위 세 테스트의 통과가 아니다.
