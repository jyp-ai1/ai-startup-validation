# PR #197 대화 엔진 구현 — CTO 1차 실행 증거

**구현 SHA:** 이 문서와 같은 커밋  
**기준:** `83596930` 일괄안 · 시나리오 본문 동결 `5263e83e` · Production `0b465226`  
**경로:** `applyBusinessChoiceThroughLoop`  
**로그인 UI:** NOT VERIFIED

V3 review/gapState는 유지했다. FIX-10이 CLOSED 문제를 되묻지 않게 했고, 결제·지인 증거는 판단만 갱신한다.

---

## 실행 결과

| 항목 | 입력 | 실제 출력 | 기대 | 판정 |
|---|---|---|---|---|
| 고객 후 문제 재질문 방지 | S1 문제=주문·배송 → 고객=반찬가게 | next=`payer`. 「주문 맞나요?」 없음 | 구매자/도입 결정자. 문제 confirm 금지 | **PASS** |
| 결제 증거 유무 | 결제 3건 vs 아직 없다 | 약증거 vs 미확정. 둘 다 `clear`/`fact`/GO 아님. Memory 미병합 | 유무가 갈림. 둘 다 HOLD | **PASS** |
| 사업별 다음 질문 | S2–S6 문제+고객 | next ≠ customerPersona/problem. 고정 why 없음 | 닫힌 슬롯 재질문 금지 | **PASS** |
| 전통주 대안 | S2 `alternativesCompetitors` | 아는 술 / 지인 / 아는 양조장. 문제 문장 재사용 없음 | 발견 우회 행동 | **PASS** |
| `아직 모르겠음` | S1 payer unknown | intent=`unknown_signal`. payer 미CLOSED. 다음 공백 이동 | Fact 오승격 금지 | **PASS** |
| 모순 재평가 | S4 고객 CLOSED 후 결제 슬롯에 「아이가 아니라 20대」 | customerPersona=`CONTRADICTED`. GO 아님 | 이전 Fact 재평가 | **PASS** |
| 지인 1회 | S5 「지인에게 판 것 1회」 | customerChange=`needs_check` · 지인 1회 이유. fact/GO 아님 | 반복 수요 아님 | **PASS** |
| 마켓플레이스 GO | S6 공급 0 + 결제 0 | GO/네트워크 효과 문구 없음 | 성급한 GO 금지 | **PASS** |
| 6사업 연속 | S1–S6 문제→고객 follow | 닫힌 고객/문제로 되돌아가지 않음 | 동일 하드코딩 흐름 금지 | **PASS** (엔진) |
| 기타+텍스트 | S1 payer 기타 + 본사 결제 | 턴 저장. 빈 기타는 대기 | 자유 입력 반영 | **PASS** (throughLoop) |
| 로그인 UI 8턴 | — | 미실행 | E2E | **NOT VERIFIED** |

테스트: `pr197-conversation-quality.test.ts` 14/14. MCQ real-loop/journey/understanding 통과. recovery2 P0-1/P0-2 통과.

기존 실패(이번 변경과 무관, baseline에서도 동일): `v3-runtime-certification` V3-03, V3-12.

---

## 수정 파일 · 함수

| 레버 | 파일 | 함수 |
|---|---|---|
| A | `ai-pm-judgment-next-question-binding.ts` | `applyJudgmentNextQuestionBinding` — CLOSED면 덮지 않음 |
| B | `decide-next-question-from-review.ts` | `pickNextRequiredGap` — 문서 한 줄보다 payer |
| C | `ai-pm-judgment-aggregation.ts` | `dimensionsFromAnswerText` / `classifyValidationEvidence` |
| D | `ai-pm-simple-question-presenter.ts` | `buildWhySummary` |
| E | `build-business-choice-question.ts` | `extractStatusQuo` |
| 기타 | `apply-business-choice-through-loop.ts` | 빈 기타만 대기 |
| S4 | `build-answer-review.ts` | 고객 슬롯 밖 정정 → CONTRADICTED |

CTO는 병합하지 않는다.
