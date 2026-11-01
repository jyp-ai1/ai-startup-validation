# Sprint 2 사업검토·피드백 반복

2026-11-01 17:08–17:09 KST. PR #226. 코드 `9412995f`.

Sprint 2 PASS는 선언하지 않는다. Sprint 3은 시작하지 않았다. Production 배포는 하지 않았다. Founder 프로젝트는 읽거나 쓰지 않았다. 5차 상담은 NOT RUN이다.

테스트 프로젝트는 sqlite `gpt-consulting-loop-project`다. 답변은 SIMULATION이다.

## 1. 변경 파일 및 커밋

`9412995f` `fix(ai-pm): pass the prior judgment and let the model choose the next question`

- `apps/web/features/business-validation-journey/lib/ai-pm-review.ts`
- `apps/web/features/business-validation-journey/lib/__tests__/ai-pm-consulting-stage.test.ts`
- `apps/web/features/business-validation-journey/lib/__tests__/ai-pm-real-gpt-consulting-loop.live.test.ts`
- `apps/web/scripts/run-web-build.sh`

후속 요청은 이전 판단 문장을 지우지 않고 전달한다. 단계 프롬프트는 전략 컨설턴트 목적과 미확인 영역 선택을 앞에 두고, 접촉·의사·조건의 고정 순서는 뺐다. 질문 문장을 코드가 고르지 않는다. 문장 단위 저장 규칙은 이번 변경에서 추가하지 않았다.

단위 테스트 112건은 2026-11-01 17:08 KST에 통과했다.

## 2. 최초 사업검토 원문

재생이다. 실호출은 0회다. 실행 `chatcmpl-EfEyBVVnnFOSMCoCUpQQIs0HlKOde`. 로컬 검토 `535dcd88-bc80-42a2-b094-a3cedad79667`. 상태 succeeded. 질문 1개: `양조장과의 협력 관계를 어떻게 구축할 것인가?`

원문 파일: `docs/evidence/ALABOM/AI-PM/sprint-2-real-gpt-continuity.json`.

## 3. 2~4차 요청·응답

2차만 실호출이다. 3차와 4차는 2차 저장이 실패해 NOT RUN이다.

| 차수 | 실행 | 모델 | 토큰 | 저장 |
| --- | --- | --- | --- | --- |
| 2 | `chatcmpl-EfKuXRvp8EvzqhOx1oHKq94a4RQch` | gpt-4o-mini-2024-07-18 | 13,729 / 1,058 / 14,787 | `stage_questions_repeated` |
| 3 | NOT RUN |  |  |  |
| 4 | NOT RUN |  |  |  |

2차 시각은 2026-11-01 17:08:56–17:09:06 KST다. 검토 `d0816d94-16f8-431f-99f1-9b0deed02de7`. 부모 `535dcd88-bc80-42a2-b094-a3cedad79667`.

요청과 응답 원문: `docs/evidence/ALABOM/AI-PM/sprint-2-consulting-loop.json`.

2차 다음 질문 원문: `양조장과의 협력 관계를 어떻게 구체화할 것인가?`

현재 판단 원문: `사업 모델의 잠재력은 남아 있으나, 양조장과의 협력 관계 구축에 대한 구체적인 계획이 부족하다. 추가 검증이 필요하다.`

`verifiedFacts`는 빈 배열이다. meaning은 고객·상품 구상을 미확인 주장으로 적었다.

## 4. 파운더 답변과 SIMULATION

2차 답 1개. 질문 `q1` `양조장과의 협력 관계를 어떻게 구축할 것인가?`

`SIMULATION. 체험을 원하는 고객과 상품 구성은 구상이다. 공급 계약과 가격은 없다. 이 답은 연습 입력이고 확인된 기록이 아니다.`

3차·4차 답변은 NOT RUN이다.

## 5. 질문·답변 연결

2차 해석의 `questionId`는 `q1`이고 `choiceId`는 빈 문자열이다. 답변 저장은 그 질문에 붙었다. 재조회도 같은 오류와 빈 `verifiedFacts`를 유지했다. 섹션이 없어 다음 질문 식별자는 저장되지 않았다.

## 6. 호출 횟수

| 동작 | 이번 실행 |
| --- | --- |
| 최초 검토 | 재생 0 |
| 2차 통합 재검토 | 1 |
| 같은 답의 중복 재검토 | 0, 기존 행 재사용 |
| 3차 | 0 |
| 4차 | 0 |
| 5차 | 0 |

최초 검토가 질문을 1개만 냈으므로, 미완료 단계의 0회 호출은 이번 실호출에서 갈라지지 않았다. 그 경로는 단위 테스트가 유지한다.

## 7. 이전 맥락 전달

2차 요청은 최초 아이디어의 `전통주`, 이번 SIMULATION 답, `priorJudgmentText` 키를 포함했다. 이전 단계 SIMULATION은 아직 없다.

## 8. 사업 방향 자체 검토

2차 판단은 잠재력을 남기고 협력 구축 계획이 부족하다고 적었다. 확인된 사실은 비어 있다. 답은 공급 계약과 가격이 없다고 말했다. 다음 질문은 그 빈칸으로 가지 않고, 방금 답한 협력 구축 질문을 `구체화`로만 바꿨다. 목적 키에서 `구축`과 `구체화`는 같은 질문이다. 사업은 공급, 가격, 고객 확보로 나아가지 않았다.

## 9. 실패·미검증

- 실패: `stage_questions_repeated`. 3차와 4차는 이 저장 실패 때문에 진행하지 않았다.
- 미검증: 3~4차의 질문 이동, 해결 상태의 다음 단계 전달, 가격·운영비·책임으로의 발전.
- 문장 규칙을 더 추가하지 않았다. 같은 입력으로 2차를 다시 호출하지 않았다.

## 10. Sprint 2 완료 가능 여부

지금은 완료로 두지 않는다. 맥락은 2차 요청까지 전달됐고 호출 횟수는 맞다. 질문이 같은 목적에 머물렀고, 최소 3~4차 연속 진행은 되지 않았다.
