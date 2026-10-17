# 실패 1·2·5 오프라인 검증 — 2026-10-16

세 실패는 미해결이다. 탐지와 해결은 다르다. 1단계 관문은 닫혀 있다. 모델 호출은 없다. 비용은 0원이다. `apps/`와 `packages/`는 바꾸지 않았다. 검사기를 제품 테스트에 넣지 않았다. 2·3단계는 착수하지 않았다.

실행은 `experiments/judgment-failure-offline/observe.ts`다. 결과 JSON은 `experiments/judgment-failure-offline/last-run.json`. 시각 `2026-10-16T12:16:45.909Z`. 기존 테스트 재실행 발췌는 `experiments/judgment-failure-offline/vitest-failure5.txt`.

## 1. 실패 1 — path1의 A2·S3 누락

입력. `experiments/business-judgment-poc/prompt.txt`의 `입력` 구간. A2, `예상 연매출`, `10억`이 있다. 그 구간에 `원장`, `결제`, `입금`, `세금계산서`는 없다.

기대. `docs/evidence/ALABOM/AI-PM/BUSINESS-JUDGMENT-POC.txt`. 출력에 A2와 S3의 예상 연매출이 있다. 원장 없는 Fact는 false다.

실제. `experiments/business-judgment-poc/path1.json`. id `pllns_ad8b0ebe46b1c7533e046a2c0e703f36`. 모델 `gpt-oss-20b`. 저장된 Fact는 false. content에 `A2`, `예상 연매출`, `10억`, `10억 원`, `10억원`, `십억`, `1,000,000,000`은 없다.

탐지. 이 오프라인 실행은 누락을 실패로 남겼다. Fact 승격은 이 파일에 없다. `apps/`·`packages/`의 `path1.json` 참조는 0건이라 기존 제품 테스트는 이 파일을 읽지 않는다.

형식 검사로 가능한 범위는 이 저장된 문장에 그 토큰이 없는 것이다. 다른 문장이 매출 의미를 바꾸어 적었는지는 이 검사가 판단하지 않는다. 이 파일에는 그 바꿔 적기도 없다.

## 2. 실패 2 — path4의 Fact true

입력. 같은 `입력` 구간. 원장·결제 표지는 없다.

기대. Fact false.

실제 모델 문장. `experiments/business-judgment-poc/path4.json`의 content. 모델 `qwen2.5:3b`. 저장된 Fact는 true. Claim은 비중과 유지 불가를 한 문장으로 합친다. Missing_Evidence는 비어 있지 않다.

`recordExternalAnalysis` 호출. 같은 content 문자열을 `text`로 넣었다. 반환 note의 `verifiedFact`는 false, `realAnalysisSuccess`는 false, `systemVerified`는 false, `liveModelCall`는 false, `claimStatus`는 `unassessed`, `status`는 `reference`다. note에 Fact 키는 없다. 원문 문자열 안에는 `"Fact": true`가 남아 있다. 함수는 그 칸을 읽어 실패로 남기지 않는다. false 고정은 이 출력의 사실 검증 성공이 아니다.

탐지. 오프라인 실행은 입력 구간에 증거 표지가 없는데 저장된 Fact가 true인 것을 실패로 남겼다. 제품 테스트의 `path4.json` 참조는 0건이다.

필드 비교로 가능한 범위는 지시 위반과, Fact true이면서 Missing_Evidence가 있는 불일치다. 그 주장이 사업에서 참인지는 이 검사가 정하지 않는다.

## 3. 실패 5 — validationTestability

입력. 공백 `validationTestability`. 질문 이슈 `competitor_analysis`. 답 `정정합니다. 초기 타깃은 방한 FIT 외국인만이 아니라, 국내 MZ 개별 여행객도 포함합니다.`

기대. quality `PARTIAL`, mergeable false. 근거는 `core-final-stabilization.test.ts` 989–996행.

2026-10-16T10:39 기록의 quality는 `VALID`다. 그 로그에 mergeable 값은 없다. 미확인으로 둔다.

이번 Vitest. 2026-10-16T12:16:54Z. 테스트 1건 실패, 77건 건너뜀. 995행에서 기대 `PARTIAL`, 실제 `VALID`. 996행 `mergeable` 단정은 실행되지 않았다. 발췌는 `vitest-failure5.txt`.

이번 함수 호출. 같은 입력. quality `VALID`. mergeable true. factKey `customer`. intent `correction`. rationale `CEO CORRECT — customer revised to , 국내 MZ 개별 여행객도 포함합`. 이 값은 10:39 로그의 mergeable을 채우지 않는다. 이번 호출의 반환이다.

탐지. 기존 테스트는 quality 불일치를 실패로 남긴다. 그 실패가 해결은 아니다. 고객 정정이 왜 `VALID`로 합쳐지는지는 반환의 factKey와 intent가 보여 주고, 문장 의미의 채점기는 없다.

## 4. 구분

| 구분 | 항목 | 실행 근거 |
| --- | --- | --- |
| 탐지 가능 | 1번의 토큰 누락 | `last-run.json` `omissionDetected` true. 제품 참조 0 |
| 탐지 가능 | 2번의 Fact true | `factTrueWithoutInputEvidence` true. 제품 참조 0 |
| 탐지 가능 | 5번의 quality | Vitest가 `VALID`와 `PARTIAL`의 불일치를 실패로 냄 |
| 의미 판단이 더 필요 | 1번의 바꿔 적기, 2번 주장의 참, 5번이 `VALID`가 된 이유 | 위 형식 검사는 그 셋을 판정하지 않음 |
| 실행 미확인 | 10:39 로그의 mergeable | 로그에 값이 없음. 이번 Vitest도 996행 전에 멈춤 |

세 실패는 통과로 바꾸지 않는다. 오프라인 탐지가 있다는 사실은 제품 통합이 아니다.

## 5. 다음 관문

1단계 관문은 닫혀 있다. 통신 왕복 기록은 이 품질 판정의 근거가 아니다. 실패 1·2·5가 기대와 같아지기 전에는 판단 관문을 열지 않는다. 제품 반영은 이번 실행에 없다.

## 6. 동결

작업 전 HEAD `d1791d98`. 이 기록 커밋 `9a9f97b0`. 그 커밋 포함 `6f71ea3a` 이후 `apps/`·`packages/` diff는 비어 있다. Production `0b465226`은 조상이다. PR #199는 초안이다.
