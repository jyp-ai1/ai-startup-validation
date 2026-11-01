# Founder Context Continuity

2026-11-01 10:16 KST. PR #226. Sprint 2 PASS는 선언하지 않는다. Sprint 3은 시작하지 않았다. Production 배포는 하지 않았다. 스키마는 바꾸지 않았다. Founder 프로젝트 행은 읽거나 쓰지 않았다.

Payload: `docs/evidence/ALABOM/AI-PM/founder-context-continuity-payloads.json`

이 파일의 응답 모델명은 `SIMULATION`이다. 주입 응답이다. 실제 GPT 응답이 아니다. 토큰은 null이다. 실호출은 `GPT_API_KEY missing`으로 NOT RUN이다.

## 1. 기존 경로

제품 경로는 그대로다.

- 최초 분석: `runFirstReview` → `POST /api/ai-pm-review` → `buildFirstReviewRequest`. 프롬프트는 `quality-2`.
- 답변 저장: `saveReviewFeedback`. 모델 호출 0회.
- 후속 통합 분석: `submitConsultingStage` → `runStageReanalysis` → `buildProductReanalysisRequest`. 라우트는 `POST /api/ai-pm-review/follow-up`.
- 같은 부모, 같은 답 재전송은 저장된 행을 반환하고 호출 0회.
- 질문이 남아 있으면 `stage_incomplete` 또는 `feedback_required`. 호출 0회.
- 단계 형식 오류는 호출 1회로 실패하고 수리 호출을 하지 않는다.

저장은 `parent_review_id`로 부모를 가리킨다. 조회는 `user_id`와 `project_id`다. `reviewChain`은 그 프로젝트 목록 안에서 부모를 따라 뿌리까지 올라간다. 후속 행의 `inputText`는 부모의 `inputText`다. 뿌리의 `inputText`가 최초 사업 아이디어다.

## 2. 최초 사업 아이디어

위치는 뿌리 검토의 `inputText`다. 후속 요청의 `originalInput`은 `reviewChain`의 첫 행 `inputText`다.

## 3. 이전 분석 연결

각 성공 행은 `sections`와, 단계 응답이면 `stageReading`을 가진다. `stageReading`에는 `updatedJudgment`, `judgmentReason`, `impactOnPreviousJudgment`, `resolvedIssues`, `unresolvedIssues`가 있다.

수정 전 후속 Payload는 직전 `sections`와 짧은 `priorAnalyses`만 넘겼다. `stageReading`의 해결 문제와 판단 이유는 행에만 있고 다음 요청에는 없었다. 최초 분석은 summary, judgment, assumptions, nextVerification, nextQuestion만 남았다.

수정 후 단계 요청은 같은 연쇄의 `priorReadings`를 넣는다. 판단, 판단 이유, 해결된 문제, 미해결 문제, 고객, 문제, 수익, 제품, 공급, 마케팅이 들어간다. 최초 분석의 고객, 문제, 시장, 수익, 미해결 목록도 `firstAnalysis`에 남긴다. 새 테이블은 없다.

## 4. Founder 답변 연결

답은 질문 검토의 feedback에 `questionId`로 붙는다. 질문 id가 없는 답은 단계에 붙지 않는다. 통합 행의 `stageAnswers`가 그 답이다.

수정 후 `answerLinks`가 각 답에 `sourceReviewId`, `questionId`, `question`, `choiceId`, `choiceLabel`, `supplement`, `submittedAt`, `status`를 붙인다. `sourceReviewId`는 그 질문이 있던 검토다. `submittedAt`은 feedback의 저장 시각이다. 없으면 null이다.

## 5. 요청 Payload

네 요청의 원문은 위 JSON이다. 실행 ID는 `sim-context-1`부터 `sim-context-4`다. 각 실행이 만든 검토 ID도 같은 원소에 있다.

| 실행 | 내용 |
| --- | --- |
| sim-context-1 | 최초 분석 요청. 사업 원문만 있다. 답변은 없다. |
| sim-context-2 | 1차 답 추가. 최초 원문과 최초 판단이 있다. |
| sim-context-3 | 1차 답은 prior, 2차 답은 현재. 1차 갱신 판단과 해결 문제가 있다. |
| sim-context-4 | 1·2차 답은 prior, 3차 답은 현재. 최초 판단, 1차 갱신, 2차 갱신이 있다. |

3차 요청의 `answerLinks` 3개, `priorReadings` 3개, `priorStagePairs` 2개, `stagePairs` 1개다.

## 6. 비교

사업 원문은 `다양한 관광객이 늘며…전통주(양조장)…`이다. 답은 SIMULATION이다.

| 항목 | 최초 분석 sim-context-1 | 후속 sim-context-4 |
| --- | --- | --- |
| 최초 사업 아이디어 | 포함 | 같은 문장 유지 |
| 이전 분석 결과 | 해당 없음 | priorReadings 3개 |
| 이전 Founder 답변 | 해당 없음 | priorStagePairs 2개 |
| 현재 Founder 답변 | 해당 없음 | stagePairs 1개 |
| 기존 판단 | 최초 판단 요청 | 최초, 1차 갱신, 2차 갱신과 판단 이유 |
| 해결된 문제 | 최초 분석이 만들 자리 | 1차·2차 resolvedIssues 유지 |
| 미해결 문제 | 최초 assumptions가 미해결로 저장됨 | 1차·2차 unresolvedIssues 유지 |
| 사업 모델 | 고객, 문제, 수익을 요청 | 최초 수익 문장과 이후 제품·공급·마케팅이 함께 있음 |

협력 가능성이 높다는 문장은 `answerReading.kinds`의 `claim`이다. `evidenceLedger.verifiedFacts`는 빈 배열이다.

## 7. 연속 분석

SIMULATION 4회 요청. 최초 1회와 후속 3회다. 각 새 분석의 `callCount`는 1이다. 응답 모델명은 `SIMULATION`이다. 실제 GPT 3회 연속은 NOT RUN이다.

## 8. 이전 답변 누락

3차 요청에 세 답의 보충이 모두 있다. 판정 PASS. 범위는 이 SIMULATION이다.

## 9. 다른 사업 혼입

같은 사용자, 다른 `project_id`에 `도시 농장 키트 사업`을 넣었다. 양조장 3차 요청 원문에 그 문장은 없다. 판정 PASS. 범위는 이 SIMULATION이다.

## 10. 발견한 문제와 수정

수정 전 단계 Payload는 최초 원문, 직전 sections, 답 쌍은 넘기고, 이전 `stageReading`의 해결 문제와 판단 이유, 답의 `sourceReviewId`와 `submittedAt`, 최초 분석의 고객·문제·수익은 넘기지 않았다.

수정은 `runStageReanalysis`가 이미 저장된 연쇄와 feedback으로 `priorReadings`와 `answerLinks`를 만들어 단계 요청에 넣는 것이다. 최초 분석 필드를 `firstAnalysis`에 더했다. 단계 프롬프트에 그 두 필드를 읽으라는 문장을 더했다. `quality-2` 요청, 호출 횟수, 스키마는 그대로다.

## 11. 수정 전후

수정 전은 위 코드 추적이다. 수정 전 Payload 파일은 없다.

수정 후 `ai-pm-founder-context.test.ts` 1건이 10:16 KST에 통과했다. 3차 요청이 원문, 세 답, 세 판단, 해결 문제, 미해결 문제, 다른 사업 부재를 확인했다.

## 12. Sprint 1 회귀

`ai-pm-consulting-stage.test.ts` 18건이 같은 시각에 통과했다. 답변 저장 0회, 단계 완료 1회, 같은 답 재전송 0회, 미답변 0회는 이 연속 테스트에서도 유지됐다.

## 13. 잔여

| 항목 | 판정 |
| --- | --- |
| 최초 원문 유지 | PASS. SIMULATION |
| 이전 분석의 판단·이유·해결·미해결 전달 | PASS. SIMULATION |
| 답과 질문의 sourceReviewId, 시각, 선택, 보충 | PASS. SIMULATION |
| 다른 사업 혼입 없음 | PASS. SIMULATION |
| 호출 규칙 | PASS. 주입 |
| Sprint 1 단계 테스트 18건 | PASS |
| 실제 GPT 응답과 그 품질 | NOT RUN. `GPT_API_KEY` 없음 |
| 로그인 브라우저 | NOT RUN |
| 토큰 예산 초과로 오래된 priorAnalyses가 빠지는 경로 | NOT RUN. 예산은 24,000이다. 이번 4회 요청은 그 안에 있다. priorReadings와 answerLinks는 그 삭제 목록에 없다 |
| 전략 컨설팅 품질 | NOT RUN |

체인 함수는 행 status로 조상을 거르지 않는다. 제품은 성공한 검토만 부모로 새 행을 만든다. 이번 테스트의 부모는 모두 성공 행이다.
