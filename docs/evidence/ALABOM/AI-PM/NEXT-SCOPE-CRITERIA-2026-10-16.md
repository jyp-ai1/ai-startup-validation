# 다음 실행 범위 — 2026-10-16

검사기를 만들지 않는다. 제품 코드, 엔진 순서, Production, PR 병합을 바꾸지 않는다. 모델 호출은 없다. 비용은 0원이다. 1단계 관문은 닫혀 있다. 2단계와 3단계는 착수하지 않는다. 이 문서는 검증 성공이 아니다.

## 1. 실패 1·2번 — 기존 도구로 검증할 수 있는가

이번 조회에서 `path1.json`과 `path4.json`을 참조하는 `.ts`, `.tsx`, `.py`, `.js`, `.mjs`는 0건이다.

ID 선택 검증기 `experiments/id-selection-validator/validator.py` 206–209행은 `lmulm-7b-ids`, `ridm-7b-ids`, `lmulm-3b-ids`, `ridm-3b-ids`만 연다. 그 네 파일은 A2·S3 누락이나 path4의 Fact를 담지 않는다.

`recordExternalAnalysis`는 모델 Fact 필드를 받지 않고 `verifiedFact`를 false로 넣는다. `judgment-development.test.ts`는 그 상수를 본다. path4를 넣지 않는다.

그래서 기존 도구를 수정 없이 실행하는 것으로는 실패 1·2번을 자동 탐지할 수 없다. 자동 탐지를 하려면 그 원문을 읽는 별도 검사, 또는 기존 도구의 입력 목록을 바꾸는 작업이 필요하다. 그 구현은 하지 않았다. 필요의 근거는 참조 0건과 검증기 206–209행이다. 승인으로 바꾸지 않는다.

## 2. 실패 5번 — 판정 기준과 mergeable

판정 기준은 `core-final-stabilization.test.ts` 995–996행이다. 같은 입력에서 `quality`는 `PARTIAL`이고 `mergeable`은 false여야 한다. 하나라도 다르면 실패다.

입력. 공백 `validationTestability`. 답 `정정합니다. 초기 타깃은 방한 FIT 외국인만이 아니라, 국내 MZ 개별 여행객도 포함합니다.`

2026-10-16T10:39:10Z의 실제 `quality`는 `VALID`다. 기대와 다르므로 실패다. 해결되지 않았다.

`mergeable`은 그 실행에서 단정 전에 중단되어 미확인이다. `VALID`라고 해서 `mergeable`이 true라고 적지 않는다. `interpret-answer-semantics.ts`에는 `VALID`이면서 `mergeable` true인 반환(738–749행, 775행)과, `mergeable` false인 반환(753–763행)이 따로 있다. 어느 반환이 이 입력에 닿았는지는 이번 실행 로그에 없다.

코드에 있는 기대 경로. 550–573행은 공백이 `validationTestability`이고 관련성 근거가 없으면 `quality` `PARTIAL`, `mergeable` false를 반환한다. 그 분기는 458행의 고객 정정 분기와 같은 `if / else if`에 있다. 고객 정정 분기가 먼저 잡히면 550행은 실행되지 않는다. 이것은 미확인인 `mergeable`을 채우는 측정이 아니다.

## 3. 두 관문을 각각 승인하려면 있어야 하는 증거

지금 있는 증거로는 어느 쪽도 승인하지 않는다.

통신 안정성. 같은 요청 형식의 최초 시도가 미리 정한 50회 이상에서 99% 이상이고, 상태 없는 시간 초과가 그 표본에 없거나 같은 본문의 재시도 1회로 새 생성이 생기지 않음이 남아 있어야 한다. 무료 조건은 가동 보장이 있거나, 없다는 문서가 실험 한도로 승인되어야 한다. 현재 30초 간격 최초 8회는 7/8이고, 시간 초과 1회의 서버 처리 여부는 확인 불가이며, Classic API 문서는 가동 보장이 없다. 7/8은 이 기준의 충족이 아니다. 익명 `gpt-oss-20b`는 GPT·Gemini가 아니다.

판단 정확도. 실패 1·2를 실패로 남기는 자동 실행이 있어야 한다. 실패 5는 `PARTIAL`과 `mergeable` false가 그 입력에서 나오거나, 미해결로 남아 있어야 한다. 테스트가 불일치를 보는 것은 제품 동작이 정상이라는 증거가 아니다. 실패 3·4는 `clarify`와 질문 문장·표면 줄의 일치가 제품 결과로 나오기 전에는 승인 근거가 아니다. `verifiedFact=false` 고정은 근거가 아니다. 사용자 답변을 모델이 다시 분석한 실행은 미실행이다.

한쪽의 기록을 다른 쪽의 승인에 쓰지 않는다. 검사기 구현과 제품 반영은 이 문서의 범위가 아니다.

## 4. 동결

작업 전 HEAD `08c4f234`. `6f71ea3a` 이후 `apps/`·`packages/` diff는 비어 있다. Production `0b465226`은 조상이다. PR #199는 초안이다. 작업 후. 커밋 `c401a6e6`. `git diff --stat 6f71ea3a..HEAD -- apps packages` 출력은 비어 있다. 비용 발생 호출은 없다. 병합과 Production 배포는 없다.
