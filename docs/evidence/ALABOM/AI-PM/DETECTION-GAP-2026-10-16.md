# 기존 도구가 실패 다섯 건을 탐지하는가 — 2026-10-16

새 검사기는 만들지 않았다. 제품 코드, 엔진 순서, 병합, Production은 바꾸지 않았다. 모델 호출은 없다. 비용은 0원이다. 1단계 관문은 닫혀 있다.

## 결과

| # | 기존 실행 파일이 이 실패를 입력으로 보는가 | 탐지 |
| --- | --- | --- |
| 1 path1의 A2·S3 누락 | 아니오. `apps/`와 실험 스크립트에서 `path1.json` 참조는 0건 | 자동 탐지 없음. 미해결 |
| 2 path4의 Fact true | 아니오. `path4.json` 참조는 0건 | 자동 탐지 없음. 미해결 |
| 3 V3-03 | 예. `v3-runtime-certification.test.ts` | 2026-10-16T10:39:10Z에 실패로 탐지. 제품 동작이 정상이라는 뜻은 아님 |
| 4 V3-12 | 예. 같은 파일 | 같은 실행에서 질문 문장과 표면 줄의 불일치를 탐지. 정상 동작이 아님 |
| 5 validationTestability | 예. `core-final-stabilization.test.ts` | quality `VALID`와 기대 `PARTIAL`의 불일치를 탐지. 미해결 |

## 보지 않는 도구

`experiments/id-selection-validator/validator.py`의 `main`은 `lmulm-7b-ids`, `ridm-7b-ids`, `lmulm-3b-ids`, `ridm-3b-ids` 네 파일만 읽는다. `validator-report.json`에 path1, path4, Fact는 없다. 이 검증기를 고쳐서 1·2번을 넣지 않았다.

`judgment-development.test.ts`는 `verifiedFact`가 false인지를 본다. path4의 Fact true를 입력으로 주지 않는다. `recordExternalAnalysis`의 false 고정은 그 모델 값을 틀린 것으로 판정한 기록이 아니다.

`plan-journey.ts`의 원장 문장은 비용 계산 답에 대한 다른 문장이다. path4의 Fact 검사를 대신하지 않는다.

1번과 2번은 파일을 다시 읽어 사람이 실패를 볼 수 있다. 현재 저장소의 실행 파일은 그 실패를 자동으로 탐지하지 못한다. 그 공백을 메우는 검사기 구현과 제품 반영은 하지 않았다.

2단계와 3단계는 착수하지 않는다.
