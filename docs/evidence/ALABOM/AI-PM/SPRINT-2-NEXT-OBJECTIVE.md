# Sprint 2 다음 검토 목적 분리

2026-11-01 17:40 KST. PR #226. 코드 `f2513c2c`.

Sprint 2 PASS는 선언하지 않는다. Sprint 3은 시작하지 않았다. Production 배포는 하지 않았다. Founder 프로젝트는 읽거나 쓰지 않았다. 3·4·5차 상담은 NOT RUN이다.

테스트 프로젝트는 sqlite `gpt-next-objective-project`다. 사용자는 `gpt-next-objective-sim`이다. 답변은 SIMULATION이다. 이전 실패 실행 `chatcmpl-EfL634bsKmQI3rCHAF4p4G6vloZMf`와 `chatcmpl-EfKuXRvp8EvzqhOx1oHKq94a4RQch`는 다시 호출하지 않았다.

## 1. 변경 파일과 커밋

`f2513c2c` `fix(ai-pm): choose the next objective from the reconstructed business`

- `apps/web/features/business-validation-journey/lib/ai-pm-review.ts`
- `apps/web/features/business-validation-journey/lib/__tests__/ai-pm-consulting-stage.test.ts`
- `apps/web/features/business-validation-journey/lib/__tests__/ai-pm-real-gpt-next-objective.live.test.ts`
- `apps/web/scripts/run-web-build.sh`

저장 검증기는 바꾸지 않았다. 문장 단위 저장 규칙은 추가하지 않았다. 질문 순서와 특정 사업 영역은 코드가 고르지 않는다.

단위 테스트 112건은 2026-11-01 17:39 KST에 통과했다.

## 2. 요청 구조에서 본 이전 실패

`chatcmpl-EfL634`의 사용자 JSON은 `currentAnswerStatements`와 `revisionTask`가 앞에 있고, 그 작업의 첫 문장이 이전 판단의 협력 갱신이었다. 응답의 `unresolvedIssues`는 상품 구성과 공급 계약을 적었고, `nextQuestions`는 `양조장과의 협력 관계를 어떻게 구체화할 것인가?`였다. 빈칸 인식과 질문 결정이 다른 칸에 머물렀다.

이번 변경은 목적 문구를 시스템 서두에 더 붙이지 않았다. 사용자 JSON의 첫 객체를 `businessState`로 두고, 그 객체에는 최초 아이디어, 현재 모델, 확인된 사실, 주장, 이미 검토한 목적, 해결, 미해결을 모았다. `priorJudgmentText`는 `doNotCopy`에 남겨 판단 갱신에만 두고 `businessState`에는 넣지 않았다.

응답 키 순서는 `businessReconstruction`, `nextReviewObjective`, `nextQuestions`를 `updatedJudgment`보다 앞에 두었다. 저장 스키마와 검토 행의 컬럼은 늘리지 않았다. 새 출력 칸은 원문에만 있고 저장 판정은 기존 규칙을 쓴다.

## 3. 실호출 1회

| 항목 | 값 |
| --- | --- |
| 실행 | `chatcmpl-EfLOkyOcJrd5Z6jdlZi72ayH6tI73` |
| 검토 | `ca95e016-46a6-494b-ae36-0c0a722a1c46` |
| 부모 | `bfd08f77-545b-4b46-a4fc-b6fe0214fd3f` |
| 모델 | gpt-4o-mini-2024-07-18 |
| 토큰 | 15,195 / 1,303 / 16,498 |
| 시각 | 2026-11-01 17:40:09–17:40:20 KST |
| 저장 | `stage_questions_repeated` |
| 중복 재검토 | 기존 행 재사용, 추가 호출 0 |
| gitSha | `f2513c2cdc41e779131da8825822f44fc449da41` |

1차 검토는 저장된 원문 `chatcmpl-EfEyBVVnnFOSMCoCUpQQIs0HlKOde`의 재생이다. 질문 `양조장과의 협력 관계를 어떻게 구축할 것인가?`

이번 답:

`SIMULATION. 체험을 원하는 고객과 상품 구성은 구상이다. 공급 계약과 가격은 없다. 이 답은 연습 입력이고 확인된 기록이 아니다.`

요청에서 확인된 것:

- 사용자 JSON 첫 키는 `businessState`다.
- `businessState`에 이전 판단 문장은 없다. `priorJudgmentText`는 `doNotCopy`에 있다.
- 스키마 순서는 `nextReviewObjective` 22, `nextQuestions` 24, `updatedJudgment` 29다.
- `confirmed`는 빈 배열이고 claims에 구상, 공급 계약·가격 부재, 연습 입력이 있다.
- `reviewedObjectives`는 닫힌 협력 질문 하나다.
- 최초 아이디어의 `전통주`와 SIMULATION 답은 요청에 있다.

## 4. 응답 원문

`businessReconstruction`

- originalIdea: 전통주 양조장 체험을 안내하고 양조장 온라인 마케팅을 지원하는 구상
- confirmed: `[]`
- claims: 고객·상품은 구상이다 / 공급 계약과 가격은 없다 / 연습 입력이고 확인된 기록이 아니다
- reviewedObjectives: `양조장과의 협력 관계를 어떻게 구축할 것인가?`
- openGaps: 협력 관계가 불확실하다 / 관광객이 높은 관심을 가질 것이다 / 협력이 원활할 것이다 / 온라인 마케팅이 효과적일 것이다

`nextReviewObjective`: `양조장과의 협력 관계를 어떻게 구축할 것인가?`

다음 질문: `양조장과의 협력 관계를 어떻게 구축할 것인가?`

선택지: 직접 계약 체결 / 공동 마케팅 전략 수립 / 체험 프로그램 개발 / 아직 핵심을 정하지 못했다 / 기타 / 직접 입력

`verifiedFacts`는 `[]`이다. meaning은 닫힌 질문 문장을 이번 답의 내용으로 적었다. updatedJudgment는 협력 불확실로 실행 가능성이 낮다고 적은 뒤, 이전 판단의 기회 문장을 다시 붙였다. 재조회는 같은 오류와 빈 확인 사실, `nextQuestion: null`이다.

원문 파일: `docs/evidence/ALABOM/AI-PM/sprint-2-next-objective.json`.

## 5. 목적 비교

| | 문장 |
| --- | --- |
| 이전 질문 | 양조장과의 협력 관계를 어떻게 구축할 것인가? |
| 이번 목적 | 양조장과의 협력 관계를 어떻게 구축할 것인가? |
| 이번 질문 | 양조장과의 협력 관계를 어떻게 구축할 것인가? |

`samePurposeAsPrior`는 true다. 표현 변경도 없다. 선택지는 같은 협력 실행 안에 있다.

사업 상태 재구성은 공급 계약과 가격이 없다는 주장과 상품이 아직 분석되지 않았다는 칸을 담았다. 다음 목적은 그 빈칸을 고르지 않고 `reviewedObjectives`의 문장을 그대로 옮겼다. openGaps의 첫 항목도 협력 불확실이다. 모델 칸의 `operations`와 `risks`는 1차 검토가 이미 적어 둔 협력 문장이다. 판단 문장을 `businessState` 밖으로 빼도, 질문 소스로 쓴 현재 모델이 그 주제를 다시 들고 있다.

## 6. 질문의 사업적 의미

이번 상담은 사업을 한 단계 전진시키지 못했다. 답은 상품이 구상이고 공급 계약과 가격이 없다고 말했다. 다음 검토는 그 공백으로 가지 않고, 방금 끝난 협력 구축 질문을 같은 문장으로 다시 물었다. 새 판단이 생길 자리가 없다.

## 7. 검증 다섯 가지

| 확인 | 결과 |
| --- | --- |
| 전체 사업을 다시 이해했는가 | 재구성 칸에 최초 아이디어, 빈 확인 사실, 세 주장, 닫힌 목적을 적었다 |
| 이전 판단과 다른 검토 목적을 선택했는가 | 선택하지 않았다. 목적 칸이 닫힌 질문과 같다 |
| 질문과 선택지가 새 판단을 가능하게 하는가 | 같은 질문을 다시 묻는다 |
| 파운더 답변과 미확인을 반영했는가 | claims와 상품·공급의 미분석 상태는 요청에 있다. 질문에는 반영되지 않았다 |
| 질문이 사업 발전에 도움이 되는가 | 같은 목적의 재질문이라 도움이 되지 않는다 |

## 8. 실패와 미검증

- 실패: `stage_questions_repeated`. 다음 검토 목적이 이전 목적과 같다.
- 미검증: 3~4차 연속 상담, 상품·공급·가격·수익으로의 실제 이동.
- 미검증: 1차 검토가 적어 둔 모델 문장에서 협력 주제를 뺀 뒤의 선택. 이번 허용 호출은 사용했다. 같은 입력의 재호출은 하지 않는다.
- 기존 실패 행과 이전 마커는 유지했다.

## 9. CTO 자체 평가

분리된 칸은 요청과 응답에 생겼다. GPT는 그 칸을 채웠다. 다음 목적은 여전히 직전 질문이다. 빈칸 목록과 목적 선택이 한 구조 안에 있어도 서로 연결되지 않았다. 목적 문구를 더 넣는 방식으로는 이 선택이 생기지 않았고, 칸을 나눈 이번 구조에서도 선택이 생기지 않았다.

Sprint 2는 PARTIAL이다. 다음 평가는 프롬프트 문장이 아니라 검토 목적을 만드는 방식 자체다. 그 평가는 이 호출 뒤에 둔다. 3~4차 상담과 Sprint 3은 시작하지 않는다.
