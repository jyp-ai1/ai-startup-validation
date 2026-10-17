# CEO 복귀 검토 — 2026-10-16

1단계 관문을 열 근거는 없다. 실패 1·2·5는 미해결이다. 10절은 그 다음 실험 확장이다. 이 문서는 그 판단을 위한 실행 증거다. 모델 재호출은 없다. 비용은 0원이다. `apps/`·`packages/`는 바꾸지 않았다. PR #199는 초안이다. Production `0b465226`은 조상이다. 2·3단계는 착수하지 않았다.

## 1. 실행 요약

저장된 path1·path4와 현재 함수를 오프라인으로 다시 읽었다. 독립 검사기는 실험 폴더에만 있다. 검사기가 라벨과 맞았다는 결과는 제품 통과가 아니다. `experiments/judgment-failure-offline/detector-run.json`의 `selfPassIsNotProductPass`는 true다.

| 실패 | 기대 | 이번 실제 | 상태 |
| --- | --- | --- | --- |
| 1 path1 | A2와 S3 `예상 연매출 10억`이 출력에 있음. 원장 없으면 Fact false | 모델 Fact와 저장 Fact가 둘 다 false. `A2`, `예상 연매출`, `10억` 없음 | 미해결. 누락은 탐지됨. 사실 승격은 이 파일에 없음 |
| 2 path4 | Fact false | 모델 Fact와 저장 Fact가 둘 다 true. 제품 함수의 `verifiedFact`는 false | 미해결. 형식 탐지됨. 함수의 false는 검증 성공이 아님 |
| 5 quality | `PARTIAL`, mergeable false | Vitest 수신값 `VALID`. 996행은 실행되지 않음. 같은 입력의 이번 호출은 quality `VALID`, mergeable true | 미해결. 10:39 원본 로그의 mergeable은 미확인 |

## 2. 원본

해시와 바이트는 `experiments/judgment-failure-offline/inventory.json`. 없는 원본은 그 파일의 `missingRaw`다.

| 경로 | 역할 | 이번 처리 |
| --- | --- | --- |
| `experiments/business-judgment-poc/prompt.txt` | 실패 1·2 입력 | 읽음. `입력` 구간을 줄 단위로 분류 |
| `experiments/business-judgment-poc/path1.json` | gpt-oss-20b 저장 출력. id `pllns_ad8b0ebe46b1c7533e046a2c0e703f36` | 본문 JSON과 `output_parse`를 다시 파싱 |
| `experiments/business-judgment-poc/path4.json` | qwen2.5:3b 저장 출력 | 본문 JSON과 `output_parse`를 다시 파싱 |
| `docs/evidence/ALABOM/AI-PM/BUSINESS-JUDGMENT-POC.txt` | 그 실행의 서술 | 원본 JSON과 대조. 서술을 사실의 대체물로 쓰지 않음 |
| `apps/web/features/business-validation-journey/lib/judgment-development.ts` | `recordExternalAnalysis` | 호출함. 수정 없음 |
| `apps/web/features/business-validation-journey/lib/__tests__/judgment-development.test.ts` | 기존 테스트 | 실행함. path 파일을 열지 않음 |
| `apps/web/features/workflow-journey/lib/business-understanding/__tests__/core-final-stabilization.test.ts` 989–996행 | 실패 5 기대 | 그 테스트만 실행 |
| `apps/web/features/workflow-journey/lib/business-understanding/interpret-answer-semantics.ts` | 품질 함수 | 같은 입력으로 호출. 수정 없음 |
| `experiments/id-selection-validator/validator.py` | 다른 네 픽스처의 형식 검사 | 실행함. path1·path4 문자열 없음 |
| 2026-10-16T10:39:10Z Vitest 원본 로그 | 실패 5의 첫 기록으로 서술된 시각 | 저장소에 파일이 없음. 미확인 |

입력 분류는 프롬프트의 규칙이다. S1·S2·A1·A2는 원장 없는 진술이라 claim. S3–S6은 `예상` 또는 `계획`이라 assumption. 입력 구간에 `원장`, `결제`, `입금`, `세금계산서`는 없다. 분류 결과는 `detector-run.json`의 `inputLines`다. 추론으로 둔 칸은 모델의 Missing_Evidence와 Next_Action이다. 그 칸을 Fact로 세지 않는다.

## 3. 실패별 결과

실패 1. path1 content에 없는 토큰은 `A2`, `예상 연매출`, `10억`이다. 모델 원문 Fact와 저장 Fact는 false로 같다. 근거 없는 Fact 승격은 이 출력에 없다. 누락과 승격은 따로다. 근거 `detector-run.json`의 `path1-stored`, `last-run.json`의 `failure1`.

실패 2. path4 모델 원문 Fact와 저장 Fact는 true로 같다. Claim은 비중과 유지 불가를 한 문장으로 합친다. 같은 문자열을 `recordExternalAnalysis`에 넣으면 note는 접수되고 `verifiedFact` false, `realAnalysisSuccess` false, `systemVerified` false, `liveModelCall` false, `claimStatus` `unassessed`, `status` `reference`다. note에 Fact 키는 없다. 원문 안에는 `"Fact": true`가 남는다. 근거 `last-run.json`의 `recordExternalAnalysis`.

실패 5. 기대는 `core-final-stabilization.test.ts` 995–996행의 `PARTIAL`과 mergeable false다. 2026-10-16T12:20:52Z Vitest는 995행에서 `VALID`를 받았다. 996행은 실행되지 않았다. 발췌 `vitest-failure5.txt`. 같은 입력의 함수 호출은 quality `VALID`, mergeable true, factKey `customer`, intent `correction`이다. 이 mergeable은 이번 호출의 값이다. 10:39 로그의 값은 아니다.

## 4. 탐지기 명령과 결과

명령 전문은 `experiments/judgment-failure-offline/commands.txt`.

`node experiments/judgment-failure-offline/detector.mjs`는 EXIT 0, `auditAgrees` true다. 맞음은 라벨과 깃발이 같다는 뜻이다.

| 사례 | 종류 | 토큰 누락 | Fact 승격 |
| --- | --- | --- | --- |
| path1-stored | 저장된 실패 | 탐지 | 없음 |
| path4-stored | 저장된 실패 | 탐지 | 탐지 |
| control-clean | 합성. A2와 `예상 연매출 10억`, Fact false | 없음 | 없음 |
| control-promotion-only | 합성. 토큰은 있고 Fact true | 없음 | 탐지 |
| denial-tokens | 합성. 토큰이 부정문에 있음 | 탐지 못 함 | 없음 |
| control-partial | 합성. quality `PARTIAL`, mergeable false | 품질 불일치 없음 | |
| failure5-this-call | 이번 함수 반환 | quality 불일치 탐지. mergeable도 기대와 다름 | |
| original-1039-log | 원본 로그 없음 | 판정 안 함 | |

`apps/`·`packages/`의 path1·path4 참조는 0건이다. 기존 제품 테스트가 실패 1·2를 못 보는 원인은 데이터 연결이다. 규칙 파일에 그 원문이 없다.

실패 5의 quality는 기존 테스트가 데이터에 연결되어 있어 탐지한다. 규칙 부재가 아니다. `VALID`가 된 이유의 의미 채점은 없다.

## 5. 기존 테스트와 새 검증의 범위

`judgment-development.test.ts`는 2026-10-16T12:20:31Z에 3건 통과, EXIT 0이다. 검증하는 것은 함수가 `verifiedFact`를 false로 두는지다. path4의 Fact true를 입력으로 주지 않는다. 이 통과는 실패 2의 해결이 아니다.

`validationTestability weak answer is PARTIAL and not mergeable`는 1건 실패, 77건 건너뜀, EXIT 1이다. quality 불일치를 본다. mergeable 단정까지 가지 않는다.

ID 검증기 `python3 validator.py`는 EXIT 0, `checks_pass` true다. 대상은 `lmulm-7b-ids`, `ridm-7b-ids`, `lmulm-3b-ids`, `ridm-3b-ids`다. 형식 실패를 잡은 결과이며 사업 판단 통과가 아니다.

새 검증은 `experiments/judgment-failure-offline/`만 사용한다. CI와 제품 테스트 목록에 넣지 않았다.

## 6. 미탐·오탐·미확인

미탐. `denial-tokens`. 문장은 A2와 10억을 부정하는데 토큰 검사는 누락으로 보지 않는다. 저장된 path1에는 그 토큰 자체가 없어 이 미탐이 path1을 가리지는 않는다. 의미 한계다.

오탐. `control-clean`과 `control-partial`은 깃발을 세우지 않았다. 이번 최소 세트에서 오탐은 없다. 다른 문장에 대한 보장은 없다.

실행 불가. 없다. 유료 호출과 GPU는 시작하지 않았다.

원본 부족. 10:39 Vitest 로그 파일이 저장소에 없다. 그 시각의 mergeable은 미확인이다. 서술 문서만 있고 로그 파일이 없는 항목은 그 시각의 실행 결과로 단정하지 않는다. 재현 가능한 품질 증거는 12:20:52Z 실행이다.

실패 1·2·5는 통과로 바꾸지 않는다.

## 7. 동결

작업 전 HEAD `62e6a3b5`. 패키지 커밋 `256f510e`. 그 커밋 포함 `6f71ea3a` 이후 `apps/`·`packages/` diff는 비어 있다. 엔진과 테스트 게이트는 바꾸지 않았다. Production `0b465226`은 조상이다. 배포와 병합은 없다. 비용은 0원이다.

## 8. 남은 일과 관문

남은 일. 토큰 검사의 부정문 미탐. 10:39 mergeable 로그 부재. 실패 5가 `customer` 정정으로 `VALID`가 되는 제품 동작. 실패 1의 A2·S3가 출력에 없는 상태. 실패 2의 Fact true.

위험. `verifiedFact` false를 사실 검증 성공으로 읽는 것. judgment-development 3건 통과나 ID 검증기 통과를 이번 세 실패의 해결로 읽는 것. 검사기의 `auditAgrees`를 1단계 통과로 읽는 것.

다음 관문. 실패 1의 출력이 A2와 S3 예상 매출을 보존하고, 원장 없는 Fact는 false일 것. 실패 2의 저장 Fact가 true로 남지 않거나, 그 true를 실패로 남기는 검사가 제품 밖에 머물더라도 제품 동작이 기대를 맞출 것. 실패 5의 이 입력이 `PARTIAL`이고 mergeable false일 것. 그 전에는 1단계 관문을 열지 않는다. 통신 왕복 성공은 이 조건에 들어가지 않는다.

## 9. 결정이 필요한 일과 이어서 할 수 있는 일

CEO 결정이 필요한 일.

- 1단계 관문을 닫힌 채로 둘지. 이 패키지의 권고는 닫힘 유지다.
- 실패 5의 제품 분기를 수정할지. 수정은 동결 해제다. 이번 스프린트는 하지 않았다.
- 탐지기를 제품 테스트에 연결할지. 연결은 `apps/` 변경이다. 하지 않았다.
- 10:39 원본 로그를 다른 보관소에서 가져올지. 없으면 mergeable은 미확인으로 남긴다.

CTO가 지시 없이 이어갈 수 있는 일.

- 실험 폴더의 검사기와 인벤토리를 같은 원본으로 다시 실행하는 것.
- 합성 사례를 실험 폴더에 더하는 것.
- 문서에 명령과 경로를 보태는 것.

제품 수정, 병합, Production, 유료 호출, 2·3단계 착수는 위 결정 없이는 시작하지 않는다.

## 10. 탐지기 확장 — 2026-10-17

실험 폴더만 바꿨다. 제품 판단 로직과 테스트 게이트는 그대로다. 검사기 라벨 일치 `auditAgrees` true는 제품 통과가 아니다. `detector-run.json`의 `selfPassIsNotProductPass`는 true다. 시각 `2026-10-17T03:07:36.871Z`.

명령은 `experiments/judgment-failure-offline/commands.txt` 7–9항이다.

### 분리한 검사

| 검사 | 보는 것 | 보지 않는 것 |
| --- | --- | --- |
| 토큰 | `A2`, `예상 연매출`, `10억`의 존재 | 부정문인지 |
| 의미 | 그 토큰이 부정 동사 없이 한 문장에 있는지 | `십억` 같은 다른 표현 |
| 승격 | 입력 구간에 증거 표지가 없는데 저장 Fact가 true인지 | 그 주장이 사업에서 참인지 |
| 함수 대조 | 원문 Fact와 `verifiedFact`, `claimStatus` | 원문 필드가 있다는 것을 검증 성공으로 셈 |

### 사례

| 사례 | 입력 요지 | 기대 | 실제 | 기록 |
| --- | --- | --- | --- | --- |
| path1-stored | 저장 content | 토큰 누락, 의미 누락, 승격 없음 | 그대로 | 실패 1 미해결 |
| path4-stored | 저장 Fact true | 토큰 누락, 의미 누락, 승격 | 그대로. 모델 Fact와 저장 Fact 일치 | 실패 2 미해결 |
| control-clean | A2 문장과 `예상 연매출 10억`, Fact false | 세 깃발 없음 | 없음 | 오탐 없음 |
| control-promotion-only | 토큰은 있고 Fact true | 승격만 | 승격만 | 누락과 승격이 분리됨 |
| denial-tokens | `A2는 출력하지 않는다. 예상 연매출 10억은 확인되지 않았다.` | 토큰 누락 아님, 의미 누락 | 그대로 | 토큰 검사 미탐 |
| ledger-absent-still-affirms | 원장 없음과 A2의 `없다`, 그리고 10억을 가정으로 적음 | 세 깃발 없음 | 없음 | 오탐 없음 |
| paraphrase-sibillion | `십억 원`만 있음 | 토큰·의미 모두 누락으로 남음 | 그대로 | 의미 검사 미탐 |

오탐 목록은 비어 있다. 미탐은 `denial-tokens`의 토큰 검사, `paraphrase-sibillion`의 의미 검사다. 근거 `detector-run.json`의 `falsePositives`, `misses`.

### 원문 Fact와 함수

`path4-raw-vs-function`. 원문 저장 Fact true. note의 `verifiedFact` false, `claimStatus` `unassessed`, Fact 키 없음, 원문 문자열에는 `"Fact": true`. `fieldMismatch` true. `verificationSuccess` false. 필드가 남아 있는 것을 검증 성공으로 두지 않는다.

### 실패 5를 나란히

| 기록 | quality | mergeable |
| --- | --- | --- |
| Vitest `vitest-failure5.txt` 12:20:52Z | 수신 `VALID`. 기대 `PARTIAL` | 996행 미실행 |
| Vitest `vitest-failure5-2026-10-17.txt` 03:07:09Z | 수신 `VALID`. 기대 `PARTIAL` | 996행 미실행 |
| 함수 호출 `last-run.json` `failure5.thisCall` | `VALID` | true. factKey `customer` |
| 10:39 원본 | 로그 파일 없음 | 미확인 |

10:39 검색은 `log-search.json`이다. `docs/`와 `experiments/`에서 그 시각 문자열이 있는 Vitest 원본은 0건이다. 있는 것은 서술 문서다. 지정 트랜스크립트와 `/tmp/f13-after/unit2.log`에도 그 시각이 없다. 이번 호출의 mergeable true로 그 시각을 채우지 않는다.

### 해결 여부

실패 1·2·5는 모두 미해결이다. 1단계 관문은 닫혀 있다. 제품 테스트 연결, 제품 수정, 병합, 배포는 하지 않았다.

확장 커밋 `f8c0956d`. 그 커밋 포함 `6f71ea3a` 이후 `apps/`·`packages/` diff는 비어 있다. Production `0b465226`은 조상이다.
