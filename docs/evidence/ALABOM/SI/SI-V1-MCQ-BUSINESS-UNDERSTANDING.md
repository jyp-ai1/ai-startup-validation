# AI PM — Business understanding via multiple-choice

**CPO Gate:** OPEN · Draft · Merge/Production 금지  
**Production:** `0b465226` UNCHANGED  
**Branch:** `cursor/ai-pm-mcq-understanding-e648`

## Inventory (no remake of passed P1 / #196 reports)

| Item | Reuse | New |
|---|---|---|
| Next-unknown pick | `selectAdaptiveNextGaps` / living gaps | — |
| Answer apply | `interpretAnswerSemantics` → review → living | choice → string |
| Judgment | `applyAnswerToJudgment` | impact trace |
| Confirm / unknown | existing confirm + `아직 모르겠습니다.` | 기타 / 아직 모르겠음 buttons |
| #196 P1 accuracy | Merge hold | not included |

## Before / after (user flow)

| 단계 | Before | After |
|---|---|---|
| 사업 입력 직후 | 자유서술 질문만. 문서 단서가 선택지로 안 보임 | 이해 요약 + 사실/가정 + 문서에서 고른 객관식 |
| 고객 문제 | 창업자가 문장을 만들어야 함 | 배송 SaaS는 주문·배송 분리, 전통주는 현장 발견처럼 사업별 선택 |
| 구매자 / 수익 / 대안 | 일반 경영 질문이거나 비어 있음 | 문서 배우·구독/수수료·현재 대안(따로 관리, 카톡) |
| 선택 후 | 답이 들어가도 다음 질문·판단이 그대로인 경우 | `applyBusinessChoiceTurn`이 living·judgment·next Q·검증 이유를 다시 계산 |
| 아직 모름 | 잘못된 가정을 사실로 잠글 위험 | unknown은 확정하지 않음. 약화 선택은 긍정 결론을 유지하지 않음 |

## Behavior

1. Short summary of understood business  
2. Confirmed facts vs unverified assumptions  
3. One highest-value unknown (already selected by engine)  
4. Business-specific options from the document, not a generic MBA list  
5. Always include 기타 · 아직 모르겠음  
6. Selection submits through the existing answer pipeline  
7. Next question / remaining gap updates after apply  
8. Free text only for 기타 or confirm/contradiction  

## Tests / build

| Suite | Result |
|---|---|
| `ai-pm-mcq-business-understanding.test.ts` A–G | 7/7 PASS |
| `ai-pm-mcq-journey.test.ts` | 5/5 PASS |
| `p0-document-understanding-loop` | PASS |
| `recovery2-p0-2-question-loop` | PASS |
| `day8d-phase-c-no-ask` | PASS |
| `day8g` G-R1 / `core-v5` competitor+diff | main 기존 실패 · 이번 변경과 무관 |
| `pnpm --filter web build` | PASS |

## Out of scope

Conversation engine rewrite · V3 SoT / Auth change · #196 extra implementation · Production deploy
